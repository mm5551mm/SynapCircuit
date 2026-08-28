import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser, getOrCreateGuestId } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getCartOwner() {
  const user = await getCurrentUser();
  if (user) return { userId: user.id, guestId: null as string | null };
  const guestId = await getOrCreateGuestId();
  return { userId: null as number | null, guestId };
}

async function loadCart(userId: number | null, guestId: string | null) {
  const whereExpr = userId
    ? eq(cartItems.userId, userId)
    : and(eq(cartItems.guestId, guestId ?? ""), isNull(cartItems.userId));

  const rows = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      product: products,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(whereExpr);

  return rows;
}

export async function GET() {
  const { userId, guestId } = await getCartOwner();
  const items = await loadCart(userId, guestId);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId = Number(body?.productId);
  const quantity = Math.max(1, Number(body?.quantity ?? 1));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  const productRows = await db.select().from(products).where(eq(products.id, productId));
  const product = productRows[0];
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { userId, guestId } = await getCartOwner();
  const whereExpr = userId
    ? and(eq(cartItems.userId, userId), eq(cartItems.productId, productId))
    : and(eq(cartItems.guestId, guestId ?? ""), eq(cartItems.productId, productId), isNull(cartItems.userId));

  const existing = await db.select().from(cartItems).where(whereExpr);
  if (existing[0]) {
    await db
      .update(cartItems)
      .set({ quantity: Math.min(product.stock || 999, existing[0].quantity + quantity) })
      .where(eq(cartItems.id, existing[0].id));
  } else {
    await db.insert(cartItems).values({
      userId,
      guestId: userId ? null : guestId,
      productId,
      quantity: Math.min(product.stock || 999, quantity),
    });
  }

  const items = await loadCart(userId, guestId);
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const itemId = Number(body?.itemId);
  const quantity = Number(body?.quantity);
  if (!itemId || !quantity || quantity < 1) {
    return NextResponse.json({ error: "itemId and quantity are required" }, { status: 400 });
  }
  const { userId, guestId } = await getCartOwner();
  const whereExpr = userId
    ? and(eq(cartItems.id, itemId), eq(cartItems.userId, userId))
    : and(eq(cartItems.id, itemId), eq(cartItems.guestId, guestId ?? ""));
  await db.update(cartItems).set({ quantity }).where(whereExpr);
  const items = await loadCart(userId, guestId);
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const itemId = Number(sp.get("itemId"));
  const { userId, guestId } = await getCartOwner();

  if (sp.get("clear") === "true") {
    const whereExpr = userId
      ? eq(cartItems.userId, userId)
      : and(eq(cartItems.guestId, guestId ?? ""), isNull(cartItems.userId));
    await db.delete(cartItems).where(whereExpr);
    return NextResponse.json({ items: [] });
  }

  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  const whereExpr = userId
    ? and(eq(cartItems.id, itemId), eq(cartItems.userId, userId))
    : and(eq(cartItems.id, itemId), eq(cartItems.guestId, guestId ?? ""));
  await db.delete(cartItems).where(whereExpr);
  const items = await loadCart(userId, guestId);
  return NextResponse.json({ items });
}
