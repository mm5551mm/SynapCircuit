"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Category = { id: number; name: string; slug: string; productCount: number };

export default function ProductFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function applyPriceFilter(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  const activeCategory = searchParams.get("category");
  const activeSort = searchParams.get("sort") ?? "newest";

  return (
    <aside className="w-full shrink-0 space-y-6 lg:w-64">
      <div>
        <p className="mb-2 text-sm font-bold text-slate-900">Sort By</p>
        <select
          value={activeSort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-slate-900">Categories</p>
        <div className="flex flex-col gap-1 text-sm">
          <button
            onClick={() => updateParam("category", null)}
            className={`rounded-lg px-3 py-1.5 text-left ${!activeCategory ? "bg-violet-100 font-semibold text-violet-800" : "hover:bg-slate-100"}`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => updateParam("category", c.slug)}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-left ${
                activeCategory === c.slug ? "bg-violet-100 font-semibold text-violet-800" : "hover:bg-slate-100"
              }`}
            >
              <span>{c.name}</span>
              <span className="text-xs text-slate-400">{c.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={applyPriceFilter}>
        <p className="mb-2 text-sm font-bold text-slate-900">Price Range (USD)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="mt-2 w-full rounded-lg bg-slate-900 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
          Apply
        </button>
      </form>
    </aside>
  );
}
