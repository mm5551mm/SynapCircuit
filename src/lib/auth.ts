import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "sc_session";
export const GUEST_COOKIE = "sc_guest";
export const SESSION_DAYS = 30;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  emailVerified: boolean;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: number) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      emailVerified: users.emailVerified,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    emailVerified: row.emailVerified,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export async function getOrCreateGuestId() {
  const jar = await cookies();
  let guestId = jar.get(GUEST_COOKIE)?.value;
  if (!guestId) {
    guestId = generateToken();
    jar.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 60,
      path: "/",
    });
  }
  return guestId;
}
