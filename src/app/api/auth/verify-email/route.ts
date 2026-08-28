import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token));
  const record = rows[0];
  if (!record) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  if (record.expiresAt.getTime() < Date.now()) {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, record.id));
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, record.userId));
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, record.id));

  return NextResponse.json({ ok: true });
}
