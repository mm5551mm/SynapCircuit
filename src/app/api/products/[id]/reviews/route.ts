import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, products, users } from "@/db/schema";
import { avg, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

async function resolveProductId(idOrSlug: string) {
  const asNumber = Number(idOrSlug);
  if (!Number.isNaN(asNumber)) {
    const rows = await db.select().from(products).where(eq(products.id, asNumber));
    if (rows[0]) return rows[0].id;
  }
  const rows = await db.select().from(products).where(eq(products.slug, idOrSlug));
  return rows[0]?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = await resolveProductId(id);
  if (!productId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.productId, productId));

  return NextResponse.json({ reviews: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const productId = await resolveProductId(id);
  if (!productId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  await db.insert(reviews).values({
    productId,
    userId: user.id,
    rating,
    comment: body.comment ?? "",
  });

  const [agg] = await db
    .select({ avgRating: avg(reviews.rating), total: count(reviews.id) })
    .from(reviews)
    .where(eq(reviews.productId, productId));

  await db
    .update(products)
    .set({ rating: Number(agg?.avgRating ?? 0).toFixed(2), reviewCount: Number(agg?.total ?? 0) })
    .where(eq(products.id, productId));

  return NextResponse.json({ ok: true });
}
