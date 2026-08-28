import { notFound } from "next/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import AdminProductForm from "@/components/admin/AdminProductForm";
import { serializeRows } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const rows = await db.select().from(products).where(eq(products.id, numericId));
  const product = rows[0];
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
      <p className="mt-1 text-sm text-slate-500">{product.name}</p>
      <div className="mt-6">
        <AdminProductForm product={serializeRows(product)} />
      </div>
    </div>
  );
}
