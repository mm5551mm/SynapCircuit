import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import SortBar from "@/components/SortBar";
import type { Product } from "@/context/AppContext";
import { serializeRows } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | undefined };

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const catRows = await db.select().from(categories).where(eq(categories.slug, slug));
  const category = catRows[0];
  if (!category) notFound();

  const sort = sp.sort || "newest";
  const page = Math.max(1, Number(sp.page || 1));
  const pageSize = 12;

  const whereExpr = and(eq(products.categoryId, category.id), eq(products.isActive, true));
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
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/categories" className="hover:text-violet-700">
          Categories
        </Link>
        {" / "}
        <span className="text-slate-800">{category.name}</span>
      </nav>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {category.image && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
            <Image src={category.image} alt={category.name} fill className="object-cover" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          {category.description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{category.description}</p>}
          <p className="mt-1 text-sm text-slate-500">{total} products found</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <SortBar basePath={`/categories/${slug}`} />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500">
            No products in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {rows.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <Pagination page={page} pageSize={pageSize} total={total} basePath={`/categories/${slug}`} searchParams={sp} />
      </div>
    </main>
  );
}
