import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, cartItems } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { createSession, verifyPassword, GUEST_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);

  // Merge guest cart into user cart
  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value;
  if (guestId) {
    const guestItems = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.guestId, guestId), isNull(cartItems.userId)));
    for (const item of guestItems) {
      const existing = await db
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.userId, user.id), eq(cartItems.productId, item.productId)));
      if (existing[0]) {
        await db
          .update(cartItems)
          .set({ quantity: existing[0].quantity + item.quantity })
          .where(eq(cartItems.id, existing[0].id));
        await db.delete(cartItems).where(eq(cartItems.id, item.id));
      } else {
        await db.update(cartItems).set({ userId: user.id, guestId: null }).where(eq(cartItems.id, item.id));
      }
    }
  }

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified },
  });
}
