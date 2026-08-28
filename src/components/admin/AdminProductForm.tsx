"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string; slug: string };

type ExistingProduct = {
  id: number;
  name: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  dealPrice: string | null;
  isDeal: boolean;
  sku: string | null;
  stock: number;
  categoryId: number | null;
  images: string[];
  specs: Record<string, string>;
  featured: boolean;
  isActive: boolean;
};

export default function AdminProductForm({ product }: { product?: ExistingProduct }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compareAtPrice ?? "");
  const [isDeal, setIsDeal] = useState(product?.isDeal ?? false);
  const [dealPrice, setDealPrice] = useState(product?.dealPrice ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [categoryId, setCategoryId] = useState(product?.categoryId ? String(product.categoryId) : "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    product?.specs ? Object.entries(product.specs).map(([key, value]) => ({ key, value })) : [],
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setImages((prev) => [...prev, data.url]);
      } else {
        setError(data.error ?? "Upload failed");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  function addSpec() {
    setSpecs((prev) => [...prev, { key: "", value: "" }]);
  }
  function updateSpec(idx: number, field: "key" | "value", value: string) {
    setSpecs((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }
  function removeSpec(idx: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !price) {
      setError("Name and price are required");
      return;
    }

    const payload = {
      name,
      description,
      price,
      compareAtPrice: compareAtPrice || null,
      isDeal,
      dealPrice: isDeal ? dealPrice || null : null,
      sku: sku || null,
      stock: Number(stock) || 0,
      categoryId: categoryId ? Number(categoryId) : null,
      images,
      specs: Object.fromEntries(specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value])),
      featured,
      isActive,
    };

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save product");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-900">Basic Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Product Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-900">Pricing & Stock</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Price (USD)</label>
            <input required type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Compare-at Price</label>
            <input type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Stock Quantity</label>
            <input required type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isDeal} onChange={(e) => setIsDeal(e.target.checked)} />
          Mark as a deal
        </label>
        {isDeal && (
          <div className="mt-2 max-w-xs">
            <label className="mb-1 block text-sm font-medium text-slate-700">Deal Price</label>
            <input type="number" step="0.01" min="0" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        )}
        <div className="mt-4 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured product
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in store)
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-900">Images</h2>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img} className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200">
              <Image src={img} alt="Product" fill className="object-cover" />
              <button type="button" onClick={() => removeImage(img)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white">
                ✕
              </button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50">
            {uploading ? "Uploading..." : "+ Upload"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">JPEG, PNG, WEBP or GIF. Max 5MB per image.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Specifications</h2>
          <button type="button" onClick={addSpec} className="text-sm font-semibold text-violet-700 hover:underline">
            + Add spec
          </button>
        </div>
        <div className="space-y-2">
          {specs.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input placeholder="Key" value={s.key} onChange={(e) => updateSpec(idx, "key", e.target.value)} className="w-1/3 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Value" value={s.value} onChange={(e) => updateSpec(idx, "value", e.target.value)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={() => removeSpec(idx)} className="text-rose-600">✕</button>
            </div>
          ))}
          {specs.length === 0 && <p className="text-sm text-slate-400">No specifications added.</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push("/admin/products")} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-100">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
