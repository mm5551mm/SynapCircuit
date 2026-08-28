import Link from "next/link";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import AdminProductsTable from "@/components/admin/AdminProductsTable";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      stock: products.stock,
      isActive: products.isActive,
      isDeal: products.isDeal,
      featured: products.featured,
      images: products.images,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} product(s) in your catalog</p>
        </div>
        <Link href="/admin/products/new" className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">
          + Add Product
        </Link>
      </div>

      <div className="mt-6">
        <AdminProductsTable products={rows} />
      </div>
    </div>
  );
}
