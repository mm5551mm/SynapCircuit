import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { restockItems } from "@/lib/orders";

const ALLOWED_STATUS = ["pending", "processing", "shipped", "delivered", "cancelled"];
const ALLOWED_PAYMENT = ["unpaid", "paid", "failed", "refunded"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (body.status !== undefined && !ALLOWED_STATUS.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }
  if (body.paymentStatus !== undefined && !ALLOWED_PAYMENT.includes(body.paymentStatus)) {
    return NextResponse.json({ error: "Invalid paymentStatus value" }, { status: 400 });
  }

  // Wrap the transition in a transaction with row locking so that:
  //  - concurrent admin updates to the same order can never race, and
  //  - stock is restocked exactly once when an order newly transitions into
  //    "cancelled" or "refunded" (never on repeated/duplicate PATCH calls).
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    const current = rows[0];
    if (!current) return null;

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) update.status = body.status;
    if (body.paymentStatus) update.paymentStatus = body.paymentStatus;

    const willCancelNow = body.status === "cancelled" && current.status !== "cancelled";
    const willRefundNow = body.paymentStatus === "refunded" && current.paymentStatus !== "refunded";
    const shouldRestock = willCancelNow || willRefundNow;

    const [row] = await tx.update(orders).set(update).where(eq(orders.id, orderId)).returning();

    if (shouldRestock) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      await restockItems(tx, items);
    }

    return row;
  });

  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (result.userId && body.status) {
    await db.insert(notifications).values({
      userId: result.userId,
      title: "Order status updated",
      message: `Your order ${result.orderNumber} is now "${result.status}".`,
      type: "order",
    });
  }

  return NextResponse.json({ order: result });
}
