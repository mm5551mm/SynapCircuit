"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";

type Settings = {
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
  currency: string;
};

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, cart, cartLoading, cartSubtotal, formatPrice, showToast, refreshCart } = useApp();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "stripe" | "paypal">("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactEmail: user?.email ?? "",
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    notes: "",
  });

  const cancelled = searchParams.get("cancelled");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (user?.email) setForm((f) => ({ ...f, contactEmail: user.email }));
  }, [user]);

  useEffect(() => {
    if (cancelled) {
      showToast("Payment was cancelled. You can try again.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelled]);

  const shippingFee = useMemo(() => {
    if (!settings) return 0;
    return cartSubtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  }, [settings, cartSubtotal]);
  const tax = useMemo(() => (settings ? cartSubtotal * settings.taxRate : 0), [settings, cartSubtotal]);
  const total = cartSubtotal + shippingFee + tax;

  const hasStockIssue = cart.some((item) => item.quantity > item.product.stock);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (hasStockIssue) {
      setError("Some items in your cart exceed available stock. Please update your cart.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: form.contactEmail,
          paymentMethod,
          notes: form.notes,
          shippingAddress: {
            fullName: form.fullName,
            phone: form.phone,
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete checkout");
        return;
      }
      await refreshCart();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        router.push("/checkout/success");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cartLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">Loading checkout...</main>;
  }

  if (cart.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-500">Add some products before checking out.</p>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
          Browse Products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-6">
          {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Contact Information</h2>
            <input
              type="email"
              required
              placeholder="Email address"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Shipping Address</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
              <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
              <input required placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm sm:col-span-2" />
              <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm sm:col-span-2" />
              <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
              <input placeholder="State / Province" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
              <input placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
              <input required placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm" />
            </div>
            <textarea
              placeholder="Order notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
              rows={2}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Payment Method</h2>
            <div className="space-y-2">
              {(
                [
                  { id: "cod", label: "Cash on Delivery", desc: "Pay when your order arrives" },
                  { id: "stripe", label: "Credit / Debit Card (Stripe)", desc: "Secure checkout via Stripe" },
                  { id: "paypal", label: "PayPal", desc: "Pay using your PayPal account" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 ${
                    paymentMethod === opt.id ? "border-violet-500 bg-violet-50" : "border-slate-200"
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === opt.id}
                    onChange={() => setPaymentMethod(opt.id)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:w-96">
          <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {cart.map((item) => {
              const hasDeal = item.product.isDeal && item.product.dealPrice;
              const price = hasDeal ? item.product.dealPrice! : item.product.price;
              const image = item.product.images?.[0] || "/images/cat-microcontrollers.jpg";
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image src={image} alt={item.product.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="line-clamp-1 font-medium text-slate-800">{item.product.name}</p>
                    <p className="text-slate-500">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{formatPrice(parseFloat(price) * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-1 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shipping</span>
              <span>{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{formatPrice(tax)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-violet-700 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
          >
            {submitting ? "Placing order..." : "Place Order"}
          </button>
        </aside>
      </form>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
