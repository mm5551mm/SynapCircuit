"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function WishlistPage() {
  const { user, wishlist, toggleWishlist, addToCart, formatPrice } = useApp();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-5xl">♡</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Please login to view your wishlist</h1>
        <Link href="/login" className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
          Login
        </Link>
      </main>
    );
  }

  if (wishlist.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-5xl">♡</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Your wishlist is empty</h1>
        <p className="mt-2 text-slate-500">Save products you love for later.</p>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
          Browse Products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Your Wishlist</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {wishlist.map((item) => {
          const hasDeal = item.product.isDeal && item.product.dealPrice;
          const image = item.product.images?.[0] || "/images/cat-microcontrollers.jpg";
          const outOfStock = item.product.stock <= 0;
          return (
            <div key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Link href={`/products/${item.product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
                <Image src={image} alt={item.product.name} fill className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Link href={`/products/${item.product.slug}`} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-violet-700">
                  {item.product.name}
                </Link>
                <span className="text-lg font-bold text-violet-700">
                  {formatPrice(hasDeal ? item.product.dealPrice! : item.product.price)}
                </span>
                <button
                  onClick={() => addToCart(item.product.id)}
                  disabled={outOfStock}
                  className="w-full rounded-lg bg-violet-700 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {outOfStock ? "Out of Stock" : "Add to Cart"}
                </button>
                <button
                  onClick={() => toggleWishlist(item.product.id)}
                  className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
