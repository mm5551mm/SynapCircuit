import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/account/orders/${id}`);

  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const rows = await db.select().from(orders).where(eq(orders.id, numericId));
  const order = rows[0];
  if (!order) notFound();

  if (order.userId !== user.id && user.role !== "admin") {
    notFound();
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const address = order.shippingAddress as Record<string, string>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/account/orders" className="hover:text-violet-700">
          Order History
        </Link>
        {" / "}
        <span className="text-slate-800">{order.orderNumber}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-600"}`}>
          {order.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
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
                  <p className="font-semibold text-slate-800">
                    {order.currency} {(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Shipping Address</h2>
            <p className="text-sm text-slate-600">
              {address.fullName} · {address.phone}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}
              {address.state ? `, ${address.state}` : ""} {address.postalCode ?? ""}
              <br />
              {address.country}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-slate-900">Payment Summary</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{order.currency} {order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span>{order.currency} {order.shippingFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>{order.currency} {order.tax}</span>
              </div>
              {parseFloat(order.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount</span>
                  <span>-{order.currency} {order.discount}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                <span>Total</span>
                <span>{order.currency} {order.total}</span>
              </div>
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment Method</dt>
                <dd className="font-medium uppercase text-slate-800">{order.paymentMethod}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Payment Status</dt>
                <dd className="font-medium capitalize text-slate-800">{order.paymentStatus}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}
