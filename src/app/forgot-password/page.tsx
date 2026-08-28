"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the email associated with your account and we&apos;ll send you a link to reset your password.
      </p>

      {done ? (
        <div className="mt-8 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          If an account exists for {email}, you will receive a password reset link shortly.
        </div>
      ) : (
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-violet-700 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-violet-700 hover:underline">
          Login
        </Link>
      </p>
    </main>
  );
}
