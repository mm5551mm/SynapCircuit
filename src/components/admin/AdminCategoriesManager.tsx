"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
};

const emptyForm = { name: "", description: "", image: "" };

export default function AdminCategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description ?? "", image: cat.image ?? "" });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setForm((f) => ({ ...f, image: data.url }));
      else setError(data.error ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/categories/${editingId}` : "/api/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm(emptyForm);
        setEditingId(null);
        load();
      } else {
        setError(data.error ?? "Could not save category");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this category? Products in this category will become uncategorized.")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">{categories.length} categories</p>
        </div>
        <button onClick={startNew} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">
          + Add Category
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            {form.image && (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                <Image src={form.image} alt="Category" fill className="object-cover" />
              </div>
            )}
            <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">
              {uploading ? "Uploading..." : "Upload image"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-400">Loading categories...</p>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">No categories yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-28 w-full bg-slate-100">
                  {cat.image && <Image src={cat.image} alt={cat.name} fill className="object-cover" />}
                </div>
                <div className="p-4">
                  <p className="font-bold text-slate-900">{cat.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{cat.productCount} products</p>
                  <div className="mt-3 flex justify-end gap-3 text-sm">
                    <button onClick={() => startEdit(cat)} className="text-violet-700 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(cat.id)} className="text-rose-600 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
