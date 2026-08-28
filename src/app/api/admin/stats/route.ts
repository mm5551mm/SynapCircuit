import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, products, users } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [orderStats] = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      totalRevenue: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.total}::numeric else 0 end), 0)`,
      pendingOrders: sql<number>`count(*) filter (where ${orders.status} = 'pending')::int`,
      processingOrders: sql<number>`count(*) filter (where ${orders.status} = 'processing')::int`,
    })
    .from(orders);

  const [productStats] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      lowStock: sql<number>`count(*) filter (where ${products.stock} < 10)::int`,
    })
    .from(products);

  const [customerStats] = await db
    .select({ totalCustomers: sql<number>`count(*) filter (where ${users.role} = 'customer')::int` })
    .from(users);

  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(8);

  const topProducts = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.name,
      unitsSold: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .groupBy(orderItems.productId, orderItems.name)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(5);

  return NextResponse.json({
    totalOrders: orderStats?.totalOrders ?? 0,
    totalRevenue: Number(orderStats?.totalRevenue ?? 0),
    pendingOrders: orderStats?.pendingOrders ?? 0,
    processingOrders: orderStats?.processingOrders ?? 0,
    totalProducts: productStats?.totalProducts ?? 0,
    lowStock: productStats?.lowStock ?? 0,
    totalCustomers: customerStats?.totalCustomers ?? 0,
    recentOrders,
    topProducts,
  });
}
