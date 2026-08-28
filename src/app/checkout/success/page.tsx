import Link from "next/link";
import { headers, cookies } from "next/headers";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, GUEST_COOKIE } from "@/lib/auth";
import { canAccessOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

type SearchParams = { order?: string; session_id?: string; simulated?: string };

function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Order not found</h1>
      <p className="mt-2 text-slate-500">We couldn&apos;t find the order you&apos;re looking for.</p>
      <Link href="/products" className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
        Continue Shopping
      </Link>
    </main>
  );
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // If redirected back from Stripe Checkout, confirm payment status server-side.
  if (sp.session_id) {
    try {
      const hdrs = await headers();
      const jar = await cookies();
      const host = hdrs.get("host");
      const protocol = hdrs.get("x-forwarded-proto") ?? "http";
      await fetch(`${protocol}://${host}/api/checkout/confirm-stripe?session_id=${sp.session_id}`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
    } catch {
      // Non-fatal: webhook will eventually reconcile payment status.
    }
  }

  const orderNumber = sp.order;
  let orderRows = orderNumber ? await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)) : [];
  let order = orderRows[0] ?? null;

  // If redirected back from YooKassa (MIR), confirm payment status server-side
  // the same way — never trust the redirect alone.
  if (order && order.paymentMethod === "mir" && order.paymentStatus !== "paid") {
    try {
      const hdrs = await headers();
      const jar = await cookies();
      const host = hdrs.get("host");
      const protocol = hdrs.get("x-forwarded-proto") ?? "http";
      await fetch(`${protocol}://${host}/api/checkout/confirm-mir?order=${orderNumber}`, {
        headers: { cookie: jar.toString() },
        cache: "no-store",
      });
      orderRows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber!));
      order = orderRows[0] ?? null;
    } catch {
      // Non-fatal: webhook will eventually reconcile payment status.
    }
  }

  if (!order) {
    return <NotFound />;
  }

  // Never rely on the order number being hard to guess — verify the current
  // requester (logged-in owner, admin, or the guest browser that placed the
  // order) is actually allowed to see these details.
  const user = await getCurrentUser();
  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value ?? null;
  const allowed = canAccessOrder(
    { userId: order.userId, guestId: order.guestId },
    { userId: user?.id ?? null, role: user?.role ?? null, guestId },
  );
  if (!allowed) {
    return <NotFound />;
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-6xl">🎉</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Thank you for your order!</h1>
      <p className="mt-2 text-slate-500">
        Your order <span className="font-semibold text-slate-800">{order.orderNumber}</span> has been placed successfully.
      </p>
      {sp.simulated && (
        <p className="mt-2 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
          Payment gateway not configured — this order was processed in simulation mode.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">{order.currency} {(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-base font-bold text-slate-900">
          <span>Total</span>
          <span>{order.currency} {order.total}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Payment status: <span className="font-semibold capitalize">{order.paymentStatus}</span> · Method: <span className="uppercase">{order.paymentMethod}</span>
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account/orders" className="rounded-full border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100">
          View My Orders
        </Link>
        <Link href="/products" className="rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
          Continue Shopping
        </Link>
      </div>
    </main>
  );
}
