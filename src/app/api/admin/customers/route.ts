import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      ordersCount: sql<number>`count(${orders.id})::int`,
      totalSpent: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.total}::numeric else 0 end), 0)`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ customers: rows });
}
