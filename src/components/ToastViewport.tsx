"use client";

import { useApp } from "@/context/AppContext";

export default function ToastViewport() {
  const { toasts } = useApp();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg backdrop-blur transition-all ${
            toast.type === "success"
              ? "bg-emerald-600/95"
              : toast.type === "error"
                ? "bg-rose-600/95"
                : "bg-slate-800/95"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
