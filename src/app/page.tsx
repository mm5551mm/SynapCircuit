import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/context/AppContext";

export const dynamic = "force-dynamic";

function serialize<T>(rows: T): T {
  return JSON.parse(JSON.stringify(rows));
}

export default async function HomePage() {
  const [featuredRaw, dealsRaw, cats] = await Promise.all([
    db
      .select()
      .from(products)
      .where(and(eq(products.isActive, true), eq(products.featured, true)))
      .orderBy(desc(products.createdAt))
      .limit(8),
    db
      .select()
      .from(products)
      .where(and(eq(products.isActive, true), eq(products.isDeal, true)))
      .orderBy(desc(products.createdAt))
      .limit(4),
    db.select().from(categories).limit(6),
  ]);
  const featured = serialize(featuredRaw) as unknown as Product[];
  const deals = serialize(dealsRaw) as unknown as Product[];

  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0">
          <Image src="/images/hero.jpg" alt="SynapCircuit" fill priority className="object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-24 lg:px-8">
          <p className="w-fit rounded-full bg-violet-600/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-300">
            Build. Power. Connect.
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
            Power your ideas with premium electronics
          </h1>
          <p className="max-w-xl text-lg text-slate-300">
            Microcontrollers, sensors, modules and components curated for makers, engineers and hobbyists.
          </p>
          <div className="flex gap-3">
            <Link href="/products" className="rounded-full bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500">
              Shop Now
            </Link>
            <Link href="/deals" className="rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10">
              View Deals
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Featured Categories</h2>
          <Link href="/categories" className="text-sm font-semibold text-violet-700 hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-slate-100">
                {cat.image && <Image src={cat.image} alt={cat.name} fill className="object-cover" />}
              </div>
              <span className="text-sm font-semibold text-slate-800 group-hover:text-violet-700">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {deals.length > 0 && (
        <section className="bg-violet-50/60 py-14">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">🔥 Hot Deals</h2>
              <Link href="/deals" className="text-sm font-semibold text-violet-700 hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {deals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Featured Products</h2>
          <Link href="/products" className="text-sm font-semibold text-violet-700 hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-12 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 text-center sm:grid-cols-3 lg:px-8">
          <div>
            <p className="text-3xl">🚚</p>
            <p className="mt-2 font-semibold">Free shipping over $75</p>
          </div>
          <div>
            <p className="text-3xl">🔒</p>
            <p className="mt-2 font-semibold">Secure Stripe & PayPal checkout</p>
          </div>
          <div>
            <p className="text-3xl">🛠️</p>
            <p className="mt-2 font-semibold">Curated for makers & engineers</p>
          </div>
        </div>
      </section>
    </main>
  );
}
