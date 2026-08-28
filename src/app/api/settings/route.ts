import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Public, read-only view of store settings needed to render checkout totals.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}
