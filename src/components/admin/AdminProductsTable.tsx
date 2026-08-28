"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: number;
  name: string;
  slug: string;
  price: string;
  stock: number;
  isActive: boolean;
  isDeal: boolean;
  featured: boolean;
  images: string[];
  categoryName: string | null;
};

export default function AdminProductsTable({ products }: { products: Row[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not delete product");
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">
        No products yet. Create your first product to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <Image src={p.images?.[0] || "/images/cat-microcontrollers.jpg"} alt={p.name} fill className="object-cover" />
                </div>
                <span className="font-medium text-slate-800">{p.name}</span>
              </td>
              <td className="px-4 py-3 text-slate-500">{p.categoryName ?? "—"}</td>
              <td className="px-4 py-3 text-slate-800">${p.price}</td>
              <td className="px-4 py-3">
                <span className={p.stock < 10 ? "font-semibold text-amber-600" : "text-slate-700"}>{p.stock}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {p.isActive ? "Active" : "Hidden"}
                </span>
                {p.isDeal && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Deal</span>}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/products/${p.id}/edit`} className="mr-3 text-violet-700 hover:underline">
                  Edit
                </Link>
                <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="text-rose-600 hover:underline disabled:opacity-50">
                  {deletingId === p.id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
