"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortBar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSort = searchParams.get("sort") ?? "newest";

  function updateSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-slate-600">Sort by</label>
      <select
        value={activeSort}
        onChange={(e) => updateSort(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="newest">Newest</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="rating">Top Rated</option>
        <option value="name">Name A-Z</option>
      </select>
    </div>
  );
}
