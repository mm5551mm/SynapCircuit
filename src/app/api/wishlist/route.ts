import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wishlistItems, products } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });
  const rows = await db
    .select({ id: wishlistItems.id, product: products })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, user.id));
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const productId = Number(body?.productId);
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  const existing = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, productId)));
  if (!existing[0]) {
    await db.insert(wishlistItems).values({ userId: user.id, productId });
  }

  const rows = await db
    .select({ id: wishlistItems.id, product: products })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, user.id));
  return NextResponse.json({ items: rows });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const productId = Number(sp.get("productId"));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });
  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, user.id), eq(wishlistItems.productId, productId)));
  const rows = await db
    .select({ id: wishlistItems.id, product: products })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, user.id));
  return NextResponse.json({ items: rows });
}
