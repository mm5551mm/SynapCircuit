"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, refreshUser, showToast } = useApp();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    setStatus("loading");
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage("Your email has been verified successfully.");
          await refreshUser();
        } else {
          setStatus("error");
          setMessage(data.error ?? "Invalid or expired verification link.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong verifying your email.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resendVerification() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.alreadyVerified ? "Your email is already verified" : "Verification email sent", "success");
      } else {
        showToast(data.error ?? "Please login first to resend verification", "error");
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      {status === "loading" && (
        <>
          <p className="text-5xl">⏳</p>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Verifying your email...</h1>
        </>
      )}
      {status === "success" && (
        <>
          <p className="text-5xl">✅</p>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Email Verified!</h1>
          <p className="mt-2 text-slate-500">{message}</p>
          <Link href="/account" className="mt-6 inline-block rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800">
            Go to Account
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-5xl">⚠️</p>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Verification Failed</h1>
          <p className="mt-2 text-slate-500">{message}</p>
          {user && !user.emailVerified && (
            <button
              onClick={resendVerification}
              disabled={resending}
              className="mt-6 rounded-full bg-violet-700 px-6 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>
          )}
          {!user && (
            <Link href="/login" className="mt-6 inline-block rounded-full border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-100">
              Login to resend
            </Link>
          )}
        </>
      )}
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
