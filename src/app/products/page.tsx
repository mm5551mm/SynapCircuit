import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import Pagination from "@/components/Pagination";
import type { Product } from "@/context/AppContext";
import { serializeRows } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | undefined };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const category = sp.category?.trim();
  const sort = sp.sort || "newest";
  const page = Math.max(1, Number(sp.page || 1));
  const pageSize = 12;

  const conditions = [eq(products.isActive, true)];
  if (q) conditions.push(or(ilike(products.name, `%${q}%`), ilike(products.description, `%${q}%`))!);
  if (category) {
    const cat = await db.select().from(categories).where(eq(categories.slug, category));
    conditions.push(cat[0] ? eq(products.categoryId, cat[0].id) : eq(products.categoryId, -1));
  }
  if (sp.minPrice) conditions.push(gte(products.price, sp.minPrice));
  if (sp.maxPrice) conditions.push(lte(products.price, sp.maxPrice));

  const whereExpr = and(...conditions);
  let orderBy;
  switch (sort) {
    case "price_asc": orderBy = asc(products.price); break;
    case "price_desc": orderBy = desc(products.price); break;
    case "rating": orderBy = desc(products.rating); break;
    case "name": orderBy = asc(products.name); break;
    default: orderBy = desc(products.createdAt);
  }

  const [rowsRaw, countRows, cats] = await Promise.all([
    db.select().from(products).where(whereExpr).orderBy(orderBy).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(whereExpr),
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        productCount: sql<number>`count(${products.id})::int`,
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(categories.name),
  ]);

  const rows = serializeRows<Product[]>(rowsRaw);
  const total = countRows[0]?.count ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {q ? `Search results for "${q}"` : category ? cats.find((c) => c.slug === category)?.name ?? "Products" : "All Products"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{total} products found</p>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <ProductFilters categories={cats} />
        <div className="flex-1">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">
              No products match your filters. Try adjusting your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {rows.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/products" searchParams={sp} />
        </div>
      </div>
    </main>
  );
}
