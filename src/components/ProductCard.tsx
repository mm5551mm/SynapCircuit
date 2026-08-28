"use client";

import Image from "next/image";
import Link from "next/link";
import { useApp, type Product } from "@/context/AppContext";
import RatingStars from "./RatingStars";

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted, formatPrice } = useApp();
  const wishlisted = isWishlisted(product.id);
  const hasDeal = product.isDeal && product.dealPrice;
  const image = product.images?.[0] || "/images/cat-microcontrollers.jpg";
  const outOfStock = product.stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {hasDeal && (
          <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">
            DEAL
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
            Out of Stock
          </span>
        )}
      </Link>
      <button
        onClick={() => toggleWishlist(product.id)}
        aria-label="Toggle wishlist"
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-lg shadow ${
          wishlisted ? "bg-rose-600 text-white" : "bg-white/90 text-slate-500 hover:text-rose-600"
        }`}
      >
        {wishlisted ? "♥" : "♡"}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[2.6em] text-sm font-semibold text-slate-900 hover:text-violet-700">
          {product.name}
        </Link>
        <RatingStars rating={parseFloat(product.rating)} />
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-lg font-bold text-violet-700">
            {formatPrice(hasDeal ? product.dealPrice! : product.price)}
          </span>
          {(hasDeal || product.compareAtPrice) && (
            <span className="text-sm text-slate-400 line-through">
              {formatPrice(product.compareAtPrice ?? product.price)}
            </span>
          )}
        </div>
        <button
          onClick={() => addToCart(product.id)}
          disabled={outOfStock}
          className="mt-2 w-full rounded-lg bg-violet-700 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
