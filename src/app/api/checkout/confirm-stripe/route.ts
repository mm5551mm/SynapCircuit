import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe";
import { finalizeOrderPayment } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";

// This endpoint is a convenience for the success page: it lets us reflect the
// payment status immediately after redirect instead of waiting for the async
// webhook. It NEVER trusts the redirect/session_id alone — it always re-verifies
// the payment status directly with Stripe's API, and finalizeOrderPayment is
// idempotent so this can never double-process a payment that the webhook also
// (or already) handled.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });

  const rows = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
  const order = rows[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Never expose another customer's order info: if the requester is
  // authenticated and this order belongs to a *different* logged-in user,
  // refuse to return any details even though the session_id itself was
  // technically valid.
  const requester = await getCurrentUser();
  if (requester && order.userId && order.userId !== requester.id && requester.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.json({ order });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("Failed to retrieve Stripe session", err);
    return NextResponse.json({ error: "Could not verify payment status" }, { status: 502 });
  }

  if (session.payment_status === "paid") {
    await finalizeOrderPayment(order.id, "stripe");
  }

  const [updated] = await db.select().from(orders).where(eq(orders.id, order.id));
  return NextResponse.json({ order: updated });
}
