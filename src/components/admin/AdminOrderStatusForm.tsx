"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded"];

export default function AdminOrderStatusForm({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: number;
  status: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(status);
  const [newPaymentStatus, setNewPaymentStatus] = useState(paymentStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, paymentStatus: newPaymentStatus }),
      });
      if (res.ok) {
        setMessage("Order updated successfully");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Could not update order");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {message && <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">{message}</p>}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Order Status</label>
        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Payment Status</label>
        <select value={newPaymentStatus} onChange={(e) => setNewPaymentStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize">
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-violet-700 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
        {saving ? "Saving..." : "Update Order"}
      </button>
    </div>
  );
}
