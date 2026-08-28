"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

export default function Navbar() {
  const { user, cartCount, wishlist, locale, setLocale, currency, setCurrency, logout, t } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; title: string; message: string; isRead: boolean }[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.items ?? []))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/products${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-violet-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-white">⚡</span>
          SynapCircuit
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-700 lg:flex">
          <Link href="/products" className="hover:text-violet-700">{t("products")}</Link>
          <Link href="/categories" className="hover:text-violet-700">{t("categories")}</Link>
          <Link href="/deals" className="hover:text-violet-700">{t("deals")}</Link>
        </nav>

        <form onSubmit={handleSearch} className="order-last flex w-full flex-1 items-center gap-2 lg:order-none lg:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-violet-500"
          />
          <button type="submit" className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">
            🔍
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3" ref={menuRef}>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "ar")}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            {Object.keys(CURRENCIES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <Link href="/wishlist" className="relative text-xl" title={t("wishlist")}>
            ♡
            {wishlist.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                {wishlist.length}
              </span>
            )}
          </Link>

          <Link href="/cart" className="relative text-xl" title={t("cart")}>
            🛒
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-violet-700 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifOpen((v) => !v);
                }}
                className="relative text-xl"
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-2 py-1 text-xs font-semibold text-slate-500">Notifications</p>
                  {notifications.length === 0 && <p className="px-2 py-3 text-sm text-slate-400">No notifications yet.</p>}
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={`rounded-lg px-2 py-2 text-sm ${n.isRead ? "text-slate-500" : "bg-violet-50 text-slate-800"}`}>
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium"
            >
              👤 {user ? user.name.split(" ")[0] : t("login")}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {user ? (
                  <>
                    <Link href="/account" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{t("account")}</Link>
                    <Link href="/account/orders" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{t("orders")}</Link>
                    {user.role === "admin" && (
                      <Link href="/admin" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{t("admin")}</Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    >
                      {t("logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{t("login")}</Link>
                    <Link href="/register" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-100">{t("register")}</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
