import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, GUEST_COOKIE } from "@/lib/auth";
import { canAccessOrder } from "@/lib/orders";
import { cookies } from "next/headers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value ?? null;

  const isOrderNumber = Number.isNaN(Number(id));
  const rows = isOrderNumber
    ? await db.select().from(orders).where(eq(orders.orderNumber, id))
    : await db.select().from(orders).where(eq(orders.id, Number(id)));
  const order = rows[0];
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = canAccessOrder(
    { userId: order.userId, guestId: order.guestId },
    { userId: user?.id ?? null, role: user?.role ?? null, guestId },
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return NextResponse.json({ order: { ...order, items } });
}
