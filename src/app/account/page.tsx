import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AccountAddresses from "@/components/AccountAddresses";
import AccountVerifyBanner from "@/components/AccountVerifyBanner";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your profile, addresses and orders</p>

      {!user.emailVerified && (
        <div className="mt-6">
          <AccountVerifyBanner />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-800">{user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-800">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-800">{user.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email Verified</dt>
              <dd className={`font-medium ${user.emailVerified ? "text-emerald-600" : "text-amber-600"}`}>
                {user.emailVerified ? "Verified" : "Not verified"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium capitalize text-slate-800">{user.role}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Quick Links</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/account/orders" className="rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50">
              📦 Order History
            </Link>
            <Link href="/wishlist" className="rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50">
              ♡ Wishlist
            </Link>
            <Link href="/cart" className="rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50">
              🛒 Cart
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 font-semibold text-violet-700 hover:bg-violet-100">
                🛠️ Admin Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AccountAddresses />
      </div>
    </main>
  );
}
