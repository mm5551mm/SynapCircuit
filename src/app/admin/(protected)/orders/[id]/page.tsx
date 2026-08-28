import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orders, orderItems, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import AdminOrderStatusForm from "@/components/admin/AdminOrderStatusForm";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const rows = await db.select().from(orders).where(eq(orders.id, numericId));
  const order = rows[0];
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const customer = order.userId ? (await db.select().from(users).where(eq(users.id, order.userId)))[0] : null;
  const address = order.shippingAddress as Record<string, string>;

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/orders" className="hover:text-violet-700">Orders</Link>
        {" / "}
        <span className="text-slate-800">{order.orderNumber}</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900">Order {order.orderNumber}</h1>
      <p className="text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image src={item.image || "/images/cat-microcontrollers.jpg"} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-slate-800">{order.currency} {(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Customer & Shipping</h2>
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Customer:</span> {customer ? `${customer.name} (${customer.email})` : "Guest"} · {order.contactEmail}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {address.fullName} · {address.phone}
              <br />
              {address.line1}{address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}{address.state ? `, ${address.state}` : ""} {address.postalCode ?? ""}
              <br />
              {address.country}
            </p>
            {order.notes && <p className="mt-2 text-sm text-slate-500">Notes: {order.notes}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Totals</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{order.currency} {order.subtotal}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span>{order.currency} {order.shippingFee}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{order.currency} {order.tax}</span></div>
              <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900"><span>Total</span><span>{order.currency} {order.total}</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Update Status</h2>
            <AdminOrderStatusForm orderId={order.id} status={order.status} paymentStatus={order.paymentStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
