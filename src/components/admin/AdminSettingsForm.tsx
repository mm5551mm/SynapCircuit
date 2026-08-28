"use client";

import { useEffect, useState } from "react";

type Settings = {
  storeName: string;
  supportEmail: string;
  currency: string;
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
};

type PaymentToggles = { stripeEnabled: boolean; mirEnabled: boolean; paypalEnabled: boolean };
type PaymentMethodStatus = {
  id: string;
  label: string;
  configured: boolean;
  enabled: boolean;
  available: boolean;
};

export default function AdminSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [integrations, setIntegrations] = useState<{ stripe: boolean; paypal: boolean; email: boolean }>({
    stripe: false,
    paypal: false,
    email: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [paymentToggles, setPaymentToggles] = useState<PaymentToggles | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStatus[]>([]);
  const [paymentSaving, setPaymentSaving] = useState(false);

  function loadPaymentSettings() {
    fetch("/api/admin/settings/payments")
      .then((r) => r.json())
      .then((d) => {
        setPaymentToggles(d.settings);
        setPaymentMethods(d.methods ?? []);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setIntegrations(d.integrations ?? { stripe: false, paypal: false, email: false });
      })
      .finally(() => setLoading(false));
    loadPaymentSettings();
  }, []);

  async function togglePaymentMethod(key: keyof PaymentToggles, value: boolean) {
    if (!paymentToggles) return;
    setPaymentSaving(true);
    try {
      const res = await fetch("/api/admin/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentToggles(data.settings);
        setPaymentMethods(data.methods ?? []);
      }
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setMessage("Settings saved successfully");
      } else {
        setMessage(data.error ?? "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <p className="text-sm text-slate-400">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {message && <p className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">{message}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Store Name</label>
            <input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Support Email</label>
            <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
            <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {["USD", "EUR", "SAR", "AED", "EGP"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tax Rate (e.g. 0.08 = 8%)</label>
            <input type="number" step="0.001" min="0" max="1" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Shipping Fee (USD)</label>
            <input type="number" step="0.01" min="0" value={settings.shippingFee} onChange={(e) => setSettings({ ...settings, shippingFee: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Free Shipping Threshold (USD)</label>
            <input type="number" step="0.01" min="0" value={settings.freeShippingThreshold} onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-60">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-bold text-slate-900">Payment Integrations</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span>Stripe</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${integrations.stripe ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {integrations.stripe ? "Configured" : "Not configured"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span>PayPal</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${integrations.paypal ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {integrations.paypal ? "Configured" : "Not configured"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span>Email (SMTP)</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${integrations.email ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {integrations.email ? "Configured" : "Not configured"}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Configure STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET, PAYPAL_CLIENT_ID / PAYPAL_SECRET / PAYPAL_ENV and SMTP_HOST / SMTP_USER / SMTP_PASS
          environment variables to enable live payments and transactional email. Card, PayPal and MIR checkout are disabled with a clear
          error message until their credentials are configured — orders are never marked as paid without real payment confirmation.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-bold text-slate-900">Payment Methods</h2>
        <p className="mb-3 text-xs text-slate-500">
          Enable or disable each checkout payment method. A method is only actually offered to customers when it is both
          enabled here AND its provider credentials are configured via environment variables.
        </p>
        {!paymentToggles ? (
          <p className="text-sm text-slate-400">Loading payment methods...</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            {(
              [
                { key: "stripeEnabled" as const, methodId: "card", label: "Visa / Mastercard (Stripe)", env: "STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY" },
                { key: "mirEnabled" as const, methodId: "mir", label: "MIR (YooKassa)", env: "YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY" },
                { key: "paypalEnabled" as const, methodId: "paypal", label: "PayPal", env: "PAYPAL_CLIENT_ID / PAYPAL_SECRET" },
              ]
            ).map((row) => {
              const status = paymentMethods.find((m) => m.id === row.methodId);
              return (
                <div key={row.key} className="flex flex-col gap-2 rounded-lg border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{row.label}</p>
                    <p className="text-xs text-slate-400">Requires: {row.env}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.configured ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {status?.configured ? "Configured" : "Not configured"}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={paymentToggles[row.key]}
                        disabled={paymentSaving}
                        onChange={(e) => togglePaymentMethod(row.key, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600"
                      />
                      <span className="text-xs text-slate-600">{status?.available ? "Live" : "Off"}</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
