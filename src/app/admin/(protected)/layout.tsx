import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️" },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 lg:px-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-2 pb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Admin Panel</p>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium">
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
