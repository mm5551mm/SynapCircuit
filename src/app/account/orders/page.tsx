import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/orders");

  const rows = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const withItems = await Promise.all(
    rows.map(async (order) => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    }),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Order History</h1>

      {withItems.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">
          <p className="text-4xl">📦</p>
          <p className="mt-3">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="mt-4 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {withItems.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {order.status}
                  </span>
                  <span className="text-lg font-bold text-violet-700">
                    {order.currency} {order.total}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
