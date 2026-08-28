"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshUser } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid email or password");
        return;
      }
      if (data.user?.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }
      await refreshUser();
      router.push("/admin");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl text-white">
          🛠️
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage SynapCircuit</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Admin Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
