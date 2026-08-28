import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const rows = sp.status
    ? await db.select().from(orders).where(eq(orders.status, sp.status)).orderBy(desc(orders.createdAt))
    : await db.select().from(orders).orderBy(desc(orders.createdAt));

  const filters = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
      <p className="mt-1 text-sm text-slate-500">{rows.length} order(s)</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
              (sp.status ?? "all") === f ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="p-16 text-center text-slate-500">No orders found.</div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer Email</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-violet-700 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-600">{o.contactEmail}</td>
                  <td className="px-4 py-3 uppercase text-slate-600">{o.paymentMethod} · <span className="capitalize">{o.paymentStatus}</span></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{o.currency} {o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
