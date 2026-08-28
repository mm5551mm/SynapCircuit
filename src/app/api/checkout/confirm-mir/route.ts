import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getYooKassaPayment } from "@/lib/yookassa";
import { finalizeOrderPayment } from "@/lib/orders";
import { getCurrentUser } from "@/lib/auth";

// Convenience endpoint for the success page: reflects MIR/YooKassa payment
// status immediately after redirect instead of waiting for the async
// webhook. Always re-verifies directly against the YooKassa API — never
// trusts the redirect alone — and finalizeOrderPayment is idempotent so this
// can never double-process a payment the webhook already handled.
export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get("order");
  if (!orderNumber) return NextResponse.json({ error: "Missing order" }, { status: 400 });

  const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  const order = rows[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const requester = await getCurrentUser();
  if (requester && order.userId && order.userId !== requester.id && requester.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.json({ order });
  }

  if (!order.yookassaPaymentId) {
    return NextResponse.json({ order });
  }

  try {
    const payment = await getYooKassaPayment(order.yookassaPaymentId);
    if (payment.status === "succeeded") {
      await finalizeOrderPayment(order.id, "mir");
    }
  } catch (err) {
    console.error("Failed to verify YooKassa payment", err);
    return NextResponse.json({ error: "Could not verify payment status" }, { status: 502 });
  }

  const [updated] = await db.select().from(orders).where(eq(orders.id, order.id));
  return NextResponse.json({ order: updated });
}
