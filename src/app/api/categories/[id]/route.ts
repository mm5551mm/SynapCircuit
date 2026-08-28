import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const f of ["name", "description", "image"]) {
    if (body[f] !== undefined) update[f] = body[f];
  }
  const [row] = await db.update(categories).set(update).where(eq(categories.id, Number(id))).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ category: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await db.delete(categories).where(eq(categories.id, Number(id)));
  return NextResponse.json({ ok: true });
}
