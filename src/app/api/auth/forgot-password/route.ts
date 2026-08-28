import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateToken } from "@/lib/auth";
import { sendEmail, resetPasswordEmailHtml } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const rows = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase()));
  const user = rows[0];

  // Always respond ok to avoid leaking which emails exist
  if (!user) return NextResponse.json({ ok: true });

  const token = generateToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const origin = req.nextUrl.origin;
  const link = `${origin}/reset-password?token=${token}`;
  await sendEmail(user.email, "Reset your SynapCircuit password", resetPasswordEmailHtml(user.name, link));

  return NextResponse.json({ ok: true });
}
