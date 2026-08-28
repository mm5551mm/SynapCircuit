import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import ProductDetailActions from "@/components/ProductDetailActions";
import ProductReviews from "@/components/ProductReviews";
import ProductCard from "@/components/ProductCard";
import RatingStars from "@/components/RatingStars";
import type { Product } from "@/context/AppContext";
import { serializeRows } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await db.select().from(products).where(eq(products.slug, slug));
  const productRaw = rows[0];
  if (!productRaw) notFound();

  const product = serializeRows<Product>(productRaw);

  const category = product.categoryId
    ? (await db.select().from(categories).where(eq(categories.id, product.categoryId)))[0]
    : null;

  const relatedRaw = product.categoryId
    ? await db
        .select()
        .from(products)
        .where(and(eq(products.categoryId, product.categoryId), ne(products.id, product.id), eq(products.isActive, true)))
        .limit(4)
    : [];
  const related = serializeRows<Product[]>(relatedRaw);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/products" className="hover:text-violet-700">Products</Link>
        {category && (
          <>
            {" / "}
            <Link href={`/categories/${category.slug}`} className="hover:text-violet-700">{category.name}</Link>
          </>
        )}
        {" / "}
        <span className="text-slate-800">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
          <Image
            src={product.images?.[0] || "/images/cat-microcontrollers.jpg"}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <RatingStars rating={parseFloat(product.rating)} />
            <span className="text-sm text-slate-500">({product.reviewCount} reviews)</span>
          </div>
          <p className="mt-4 text-slate-600">{product.description}</p>
          <div className="mt-6">
            <ProductDetailActions product={product} />
          </div>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-bold text-slate-900">Specifications</h2>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(product.specs).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-500">{key}</td>
                      <td className="py-2 text-slate-800">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Customer Reviews</h2>
        <ProductReviews productId={product.id} />
      </div>

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 text-xl font-bold text-slate-900">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
