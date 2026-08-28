import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
      <p className="mt-1 text-sm text-slate-500">{rows.length} registered user(s)</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3 text-right">Total Spent</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={u.emailVerified ? "text-emerald-600" : "text-amber-600"}>{u.emailVerified ? "Yes" : "No"}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.ordersCount}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">${Number(u.totalSpent).toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
