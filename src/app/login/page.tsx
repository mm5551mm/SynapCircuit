"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, refreshCart, showToast } = useApp();
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
      await refreshUser();
      await refreshCart();
      showToast("Welcome back!", "success");
      const redirectTo = searchParams.get("redirect") || "/account";
      router.push(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Login to your SynapCircuit account</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-violet-700 hover:underline">
              Forgot password?
            </Link>
          </div>
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
          className="w-full rounded-lg bg-violet-700 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-violet-700 hover:underline">
          Register
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Demo accounts</p>
        <p>Admin: admin@synapcircuit.com / Admin@12345</p>
        <p>Customer: customer@synapcircuit.com / Customer@12345</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
