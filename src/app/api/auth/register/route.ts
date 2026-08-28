import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, emailVerificationTokens, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, generateToken, hashPassword } from "@/lib/auth";
import { sendEmail, verificationEmailHtml } from "@/lib/mailer";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing[0]) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, email: email.toLowerCase(), passwordHash })
    .returning();

  const token = generateToken();
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const origin = req.nextUrl.origin;
  const link = `${origin}/verify-email?token=${token}`;
  await sendEmail(user.email, "Verify your SynapCircuit account", verificationEmailHtml(user.name, link));

  await db.insert(notifications).values({
    userId: user.id,
    title: "Welcome to SynapCircuit!",
    message: "Your account has been created. Please verify your email address.",
    type: "info",
  });

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
  });
}
