import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

async function resolveProduct(idOrSlug: string) {
  const asNumber = Number(idOrSlug);
  if (!Number.isNaN(asNumber)) {
    const rows = await db.select().from(products).where(eq(products.id, asNumber));
    if (rows[0]) return rows[0];
  }
  const rows = await db.select().from(products).where(eq(products.slug, idOrSlug));
  return rows[0] ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await resolveProduct(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updatedAt: new Date() };
  const fields = [
    "name",
    "description",
    "stock",
    "categoryId",
    "images",
    "specs",
    "featured",
    "isDeal",
    "isActive",
    "sku",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) update[f] = body[f];
  }
  if (body.price !== undefined) update.price = String(body.price);
  if (body.compareAtPrice !== undefined) update.compareAtPrice = body.compareAtPrice ? String(body.compareAtPrice) : null;
  if (body.dealPrice !== undefined) update.dealPrice = body.dealPrice ? String(body.dealPrice) : null;

  const [row] = await db.update(products).set(update).where(eq(products.id, Number(id))).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(products).where(eq(products.id, Number(id)));
  return NextResponse.json({ ok: true });
}
