"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser, refreshCart, showToast } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create your account");
        return;
      }
      await refreshUser();
      await refreshCart();
      showToast("Account created! Please check your email to verify your address.", "success");
      router.push("/account");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Join SynapCircuit to shop, track orders and save favorites</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
        </div>
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
          <p className="mt-1 text-xs text-slate-400">At least 8 characters</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-violet-700 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-violet-700 hover:underline">
          Login
        </Link>
      </p>
    </main>
  );
}
