import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const category = sp.get("category")?.trim();
  const minPrice = sp.get("minPrice");
  const maxPrice = sp.get("maxPrice");
  const sort = sp.get("sort") || "newest";
  const deals = sp.get("deals") === "true";
  const featured = sp.get("featured") === "true";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(48, Math.max(1, Number(sp.get("pageSize") || 12)));

  const conditions = [eq(products.isActive, true)];
  if (q) {
    conditions.push(
      or(ilike(products.name, `%${q}%`), ilike(products.description, `%${q}%`))!,
    );
  }
  if (category) {
    const cat = await db.select().from(categories).where(eq(categories.slug, category));
    if (cat[0]) conditions.push(eq(products.categoryId, cat[0].id));
    else conditions.push(eq(products.categoryId, -1));
  }
  if (minPrice) conditions.push(gte(products.price, minPrice));
  if (maxPrice) conditions.push(lte(products.price, maxPrice));
  if (deals) conditions.push(eq(products.isDeal, true));
  if (featured) conditions.push(eq(products.featured, true));

  const whereExpr = and(...conditions);

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

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(whereExpr)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(whereExpr),
  ]);

  return NextResponse.json({
    products: rows,
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || body?.price === undefined) {
    return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
  }

  const slugBase = slugify(body.name);
  let slug = slugBase;
  let i = 1;
  while ((await db.select().from(products).where(eq(products.slug, slug))).length > 0) {
    slug = `${slugBase}-${i++}`;
  }

  const [row] = await db
    .insert(products)
    .values({
      name: body.name,
      slug,
      description: body.description ?? "",
      price: String(body.price),
      compareAtPrice: body.compareAtPrice ? String(body.compareAtPrice) : null,
      dealPrice: body.dealPrice ? String(body.dealPrice) : null,
      isDeal: Boolean(body.isDeal),
      stock: Number(body.stock ?? 0),
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      images: Array.isArray(body.images) ? body.images : [],
      specs: body.specs ?? {},
      featured: Boolean(body.featured),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    })
    .returning();

  return NextResponse.json({ product: row }, { status: 201 });
}
