import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      image: categories.image,
      createdAt: categories.createdAt,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return NextResponse.json({ categories: rows });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slugBase = slugify(body.name);
  let slug = slugBase;
  let i = 1;
  while ((await db.select().from(categories).where(eq(categories.slug, slug))).length > 0) {
    slug = `${slugBase}-${i++}`;
  }

  const [row] = await db
    .insert(categories)
    .values({ name: body.name, slug, description: body.description ?? "", image: body.image ?? null })
    .returning();

  return NextResponse.json({ category: row }, { status: 201 });
}
