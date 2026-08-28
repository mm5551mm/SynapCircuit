import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailVerificationTokens } from "@/db/schema";
import { getCurrentUser, generateToken } from "@/lib/auth";
import { sendEmail, verificationEmailHtml } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const token = generateToken();
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  const origin = req.nextUrl.origin;
  const link = `${origin}/verify-email?token=${token}`;
  await sendEmail(user.email, "Verify your SynapCircuit account", verificationEmailHtml(user.name, link));
  return NextResponse.json({ ok: true });
}
