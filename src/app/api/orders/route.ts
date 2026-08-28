import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  const withItems = await Promise.all(
    rows.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    }),
  );

  return NextResponse.json({ orders: withItems });
}
