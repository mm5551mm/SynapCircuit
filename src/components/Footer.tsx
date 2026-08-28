import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">⚡</span>
            SynapCircuit
          </p>
          <p className="mt-3 text-sm text-slate-400">
            Your trusted source for microcontrollers, sensors, robotics kits and prototyping tools.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-white">All Products</Link></li>
            <li><Link href="/categories" className="hover:text-white">Categories</Link></li>
            <li><Link href="/deals" className="hover:text-white">Deals</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/account" className="hover:text-white">My Account</Link></li>
            <li><Link href="/account/orders" className="hover:text-white">Order History</Link></li>
            <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Support</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>support@synapcircuit.com</li>
            <li>Mon-Fri 9am - 6pm</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SynapCircuit. All rights reserved.
      </div>
    </footer>
  );
}
