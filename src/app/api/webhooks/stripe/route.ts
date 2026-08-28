import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { finalizeOrderPayment, restockItems } from "@/lib/orders";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    // Never silently accept unsigned/unverified webhook traffic.
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Never trust the webhook payload alone — re-verify payment status directly
      // with Stripe's API before marking anything as paid.
      const verified = await stripe.checkout.sessions.retrieve(session.id);
      if (verified.payment_status === "paid") {
        const rows = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id));
        const order = rows[0];
        if (order) {
          // finalizeOrderPayment is idempotent (row-locked + paymentStatus guard),
          // so duplicate webhook deliveries for the same session are a no-op.
          await finalizeOrderPayment(order.id, "stripe");
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const rows = await db.select().from(orders).where(eq(orders.stripeSessionId, session.id));
      const order = rows[0];
      if (order && order.paymentStatus === "unpaid" && order.status === "pending") {
        await db.transaction(async (tx) => {
          const locked = await tx.select().from(orders).where(eq(orders.id, order.id)).for("update");
          const current = locked[0];
          if (!current || current.paymentStatus !== "unpaid" || current.status !== "pending") return;
          const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, current.id));
          await restockItems(tx, items);
          await tx
            .update(orders)
            .set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() })
            .where(eq(orders.id, current.id));
        });
      }
    }
  } catch (err) {
    console.error("Stripe webhook processing failed", err);
    // Return 500 so Stripe retries delivery instead of silently losing the event.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
