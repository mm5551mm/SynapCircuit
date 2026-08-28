import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(addresses).where(and(eq(addresses.id, Number(id)), eq(addresses.userId, user.id)));
  return NextResponse.json({ ok: true });
}
