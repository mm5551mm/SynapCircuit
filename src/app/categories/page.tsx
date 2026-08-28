import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const cats = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      image: categories.image,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Shop by Category</h1>
      <p className="mt-1 text-sm text-slate-500">Browse our full range of electronics categories</p>

      {cats.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">
          No categories available yet.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                {cat.image && (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-violet-700">{cat.name}</h2>
                {cat.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{cat.description}</p>}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violet-600">
                  {cat.productCount} {cat.productCount === 1 ? "product" : "products"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
