import { db } from "@/db";
import { products } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import SortBar from "@/components/SortBar";
import type { Product } from "@/context/AppContext";
import { serializeRows } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | undefined };

export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const sort = sp.sort || "newest";
  const page = Math.max(1, Number(sp.page || 1));
  const pageSize = 12;

  const whereExpr = and(eq(products.isActive, true), eq(products.isDeal, true));
  let orderBy;
  switch (sort) {
    case "price_asc":
      orderBy = asc(products.price);
      break;
    case "price_desc":
      orderBy = desc(products.price);
      break;
    case "rating":
      orderBy = desc(products.rating);
      break;
    case "name":
      orderBy = asc(products.name);
      break;
    default:
      orderBy = desc(products.createdAt);
  }

  const [rowsRaw, countRows] = await Promise.all([
    db.select().from(products).where(whereExpr).orderBy(orderBy).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(whereExpr),
  ]);
  const rows = serializeRows<Product[]>(rowsRaw);
  const total = countRows[0]?.count ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">🔥 Hot Deals</h1>
      <p className="mt-1 text-sm text-slate-500">{total} deals found</p>

      <div className="mt-6 flex items-center justify-end">
        <SortBar basePath="/deals" />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">
            No active deals right now. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {rows.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/deals" searchParams={sp} />
      </div>
    </main>
  );
}
