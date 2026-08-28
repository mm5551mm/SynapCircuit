"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";

export default function AccountVerifyBanner() {
  const { showToast } = useApp();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.alreadyVerified ? "Your email is already verified" : "Verification email sent", "success");
      } else {
        showToast(data.error ?? "Could not resend verification email", "error");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center">
      <span>⚠️ Your email address is not verified yet. Please verify to unlock all features.</span>
      <button
        onClick={resend}
        disabled={sending}
        className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {sending ? "Sending..." : "Resend Verification Email"}
      </button>
    </div>
  );
}
