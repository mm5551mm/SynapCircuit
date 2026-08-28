"use client";

import { useState } from "react";
import { useApp, type Product } from "@/context/AppContext";

export default function ProductDetailActions({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted, formatPrice } = useApp();
  const [qty, setQty] = useState(1);
  const hasDeal = product.isDeal && product.dealPrice;
  const outOfStock = product.stock <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-black text-violet-700">
          {formatPrice(hasDeal ? product.dealPrice! : product.price)}
        </span>
        {(hasDeal || product.compareAtPrice) && (
          <span className="text-lg text-slate-400 line-through">
            {formatPrice(product.compareAtPrice ?? product.price)}
          </span>
        )}
      </div>
      <p className={`text-sm font-semibold ${outOfStock ? "text-rose-600" : "text-emerald-600"}`}>
        {outOfStock ? "Out of stock" : `In stock (${product.stock} available)`}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-slate-300">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-lg">-</button>
          <span className="w-10 text-center">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))} className="px-3 py-2 text-lg">+</button>
        </div>
        <button
          onClick={() => addToCart(product.id, qty)}
          disabled={outOfStock}
          className="flex-1 rounded-lg bg-violet-700 py-3 font-semibold text-white hover:bg-violet-800 disabled:bg-slate-300"
        >
          Add to Cart
        </button>
        <button
          onClick={() => toggleWishlist(product.id)}
          className={`rounded-lg border px-4 py-3 text-xl ${isWishlisted(product.id) ? "border-rose-600 bg-rose-50 text-rose-600" : "border-slate-300 hover:bg-slate-100"}`}
        >
          {isWishlisted(product.id) ? "♥" : "♡"}
        </button>
      </div>
    </div>
  );
}
