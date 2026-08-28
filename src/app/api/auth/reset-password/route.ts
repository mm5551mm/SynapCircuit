import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, parsed.data.token));
  const record = rows[0];
  if (!record) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  if (record.expiresAt.getTime() < Date.now()) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id));
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id));
  // Invalidate all sessions for security
  await db.delete(sessions).where(eq(sessions.userId, record.userId));

  return NextResponse.json({ ok: true });
}
