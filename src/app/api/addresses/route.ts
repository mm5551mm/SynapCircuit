import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return NextResponse.json({ addresses: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.fullName || !body.line1 || !body.city || !body.country || !body.phone) {
    return NextResponse.json({ error: "Missing required address fields" }, { status: 400 });
  }

  if (body.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }

  const [row] = await db
    .insert(addresses)
    .values({
      userId: user.id,
      fullName: body.fullName,
      phone: body.phone,
      line1: body.line1,
      line2: body.line2 ?? "",
      city: body.city,
      state: body.state ?? "",
      postalCode: body.postalCode ?? "",
      country: body.country,
      isDefault: Boolean(body.isDefault),
    })
    .returning();

  return NextResponse.json({ address: row }, { status: 201 });
}
