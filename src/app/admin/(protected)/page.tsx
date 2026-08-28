import Link from "next/link";
import { db } from "@/db";
import { orders, orderItems, products, users } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default async function AdminDashboardPage() {
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

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8);

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

  const cards = [
    { label: "Total Revenue", value: `$${Number(orderStats?.totalRevenue ?? 0).toFixed(2)}`, icon: "💰" },
    { label: "Total Orders", value: orderStats?.totalOrders ?? 0, icon: "🧾" },
    { label: "Pending Orders", value: orderStats?.pendingOrders ?? 0, icon: "⏳" },
    { label: "Total Products", value: productStats?.totalProducts ?? 0, icon: "📦" },
    { label: "Low Stock (<10)", value: productStats?.lowStock ?? 0, icon: "⚠️" },
    { label: "Customers", value: customerStats?.totalCustomers ?? 0, icon: "👥" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Overview of your store performance</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl">{c.icon}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-violet-700 hover:underline">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{o.orderNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {o.status}
                  </span>
                  <span className="font-semibold text-slate-800">{o.currency} {o.total}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">Top Selling Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400">No sales yet.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p) => (
                <div key={p.productId ?? p.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="text-slate-500">{p.unitsSold} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
