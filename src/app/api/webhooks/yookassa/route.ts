import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getYooKassaPayment } from "@/lib/yookassa";
import { finalizeOrderPayment, restockItems } from "@/lib/orders";
import { orderItems } from "@/db/schema";

interface YooKassaNotification {
  event: string;
  object: { id: string };
}

// YooKassa notifications are not HMAC-signed by default, so — per YooKassa's
// own guidance — the incoming payload is only ever treated as a *hint*. We
// always re-fetch the authoritative payment status directly from the
// YooKassa API before trusting it, and finalizeOrderPayment is idempotent so
// duplicate/replayed notifications can never double-process a payment.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let notification: YooKassaNotification;
  try {
    notification = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paymentId = notification.object?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  try {
    const payment = await getYooKassaPayment(paymentId);
    const orderIdRaw = payment.metadata?.order_id;
    if (!orderIdRaw) return NextResponse.json({ received: true });

    const rows = await db.select().from(orders).where(eq(orders.yookassaPaymentId, payment.id));
    const order = rows[0];
    if (!order || String(order.id) !== orderIdRaw) return NextResponse.json({ received: true });

    if (payment.status === "succeeded") {
      await finalizeOrderPayment(order.id, "mir");
    } else if (payment.status === "canceled" && order.paymentStatus === "unpaid" && order.status === "pending") {
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
  } catch (error) {
    console.error("Failed to process YooKassa webhook", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
