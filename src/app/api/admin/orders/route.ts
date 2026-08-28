import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { expireStalePendingOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await expireStalePendingOrders().catch((err) => console.error("expireStalePendingOrders failed", err));
  const status = req.nextUrl.searchParams.get("status");
  const rows = status
    ? await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt))
    : await db.select().from(orders).orderBy(desc(orders.createdAt));

  const withItems = await Promise.all(
    rows.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    }),
  );

  return NextResponse.json({ orders: withItems });
}
