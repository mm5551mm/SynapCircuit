"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function CartPage() {
  const { cart, cartLoading, cartSubtotal, updateCartQuantity, removeCartItem, clearCart, formatPrice } = useApp();

  if (cartLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">
        Loading your cart...
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-500">Looks like you haven&apos;t added anything to your cart yet.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-4">
          {cart.map((item) => {
            const hasDeal = item.product.isDeal && item.product.dealPrice;
            const price = hasDeal ? item.product.dealPrice! : item.product.price;
            const lineTotal = parseFloat(price) * item.quantity;
            const image = item.product.images?.[0] || "/images/cat-microcontrollers.jpg";
            const maxQty = item.product.stock > 0 ? item.product.stock : 99;

            return (
              <div key={item.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Link href={`/products/${item.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <Image src={image} alt={item.product.name} fill className="object-cover" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/products/${item.product.slug}`} className="font-semibold text-slate-900 hover:text-violet-700">
                      {item.product.name}
                    </Link>
                    <button onClick={() => removeCartItem(item.id)} className="text-sm text-rose-600 hover:underline">
                      Remove
                    </button>
                  </div>
                  {item.product.stock <= 0 && (
                    <p className="text-sm font-semibold text-rose-600">This item is now out of stock</p>
                  )}
                  {item.quantity > item.product.stock && item.product.stock > 0 && (
                    <p className="text-sm font-semibold text-amber-600">Only {item.product.stock} left in stock</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button
                        onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="px-3 py-1.5 text-lg"
                      >
                        -
                      </button>
                      <span className="w-10 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, Math.min(maxQty, item.quantity + 1))}
                        className="px-3 py-1.5 text-lg"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-lg font-bold text-violet-700">{formatPrice(lineTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          <button onClick={() => clearCart()} className="text-sm text-slate-500 hover:text-rose-600 hover:underline">
            Clear entire cart
          </button>
        </div>

        <aside className="w-full shrink-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:w-80">
          <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{formatPrice(cartSubtotal)}</span>
          </div>
          <p className="text-xs text-slate-400">Shipping and tax calculated at checkout.</p>
          <Link
            href="/checkout"
            className="block w-full rounded-lg bg-violet-700 py-3 text-center font-semibold text-white hover:bg-violet-800"
          >
            Proceed to Checkout
          </Link>
          <Link href="/products" className="block w-full text-center text-sm font-medium text-violet-700 hover:underline">
            Continue Shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
