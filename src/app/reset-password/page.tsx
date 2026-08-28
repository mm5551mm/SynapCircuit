"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setError(data.error ?? "Could not reset your password. The link may have expired.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-5xl">⚠️</p>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Invalid Reset Link</h1>
        <p className="mt-2 text-slate-500">This password reset link is missing or invalid.</p>
        <Link href="/forgot-password" className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
          Request a new link
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>

      {done ? (
        <div className="mt-8 rounded-xl bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          Your password has been reset successfully. Redirecting to login...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
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
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
