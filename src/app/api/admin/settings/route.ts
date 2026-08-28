import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";
import { isStripeConfigured } from "@/lib/stripe";
import { isPaypalConfigured } from "@/lib/paypal";
import { isEmailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    settings,
    integrations: { stripe: isStripeConfigured(), paypal: isPaypalConfigured(), email: isEmailConfigured() },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const settings = await updateSettings(body);
  return NextResponse.json({ settings });
}
