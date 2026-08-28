"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

type Address = {
  id: number;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

const emptyForm = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  isDefault: false,
};

export default function AccountAddresses() {
  const { showToast } = useApp();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/addresses");
      const data = await res.json();
      setAddresses(data.addresses ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Address saved", "success");
        setForm(emptyForm);
        setShowForm(false);
        load();
      } else {
        showToast(data.error ?? "Could not save address", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Address removed", "info");
      load();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Saved Addresses</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-semibold text-violet-700 hover:underline"
        >
          {showForm ? "Cancel" : "+ Add address"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="State / Province" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Set as default address
          </label>
          <button type="submit" disabled={submitting} className="rounded-lg bg-violet-700 py-2 text-sm font-semibold text-white hover:bg-violet-800 sm:col-span-2 disabled:opacity-60">
            {submitting ? "Saving..." : "Save Address"}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400">Loading addresses...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-slate-400">No saved addresses yet.</p>
        ) : (
          addresses.map((a) => (
            <div key={a.id} className="flex items-start justify-between rounded-xl border border-slate-200 p-4 text-sm">
              <div>
                <p className="font-semibold text-slate-800">
                  {a.fullName} {a.isDefault && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">Default</span>}
                </p>
                <p className="text-slate-500">{a.phone}</p>
                <p className="text-slate-500">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode ?? ""}, {a.country}
                </p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-rose-600 hover:underline">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
