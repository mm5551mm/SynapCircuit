import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
  return NextResponse.json({ items: rows });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.markAllRead) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
    return NextResponse.json({ ok: true });
  }
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  return NextResponse.json({ ok: true });
}
