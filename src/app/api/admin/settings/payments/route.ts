import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getPaymentMethodsStatus, getPaymentSettings, updatePaymentSettings } from "@/lib/paymentSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  void admin;

  const [settings, methods] = await Promise.all([getPaymentSettings(), getPaymentMethodsStatus()]);

  return NextResponse.json({
    settings: {
      stripeEnabled: settings.stripeEnabled,
      mirEnabled: settings.mirEnabled,
      paypalEnabled: settings.paypalEnabled,
      updatedAt: settings.updatedAt,
    },
    methods,
    webhooks: {
      stripe: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      paypal: Boolean(process.env.PAYPAL_WEBHOOK_ID),
      yookassa: true, // YooKassa notifications are verified via direct API re-fetch, not signatures
    },
  });
}

const schema = z.object({
  stripeEnabled: z.boolean().optional(),
  mirEnabled: z.boolean().optional(),
  paypalEnabled: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await updatePaymentSettings(parsed.data, admin.id);

  const [settings, methods] = await Promise.all([getPaymentSettings(), getPaymentMethodsStatus()]);

  return NextResponse.json({
    settings: {
      stripeEnabled: settings.stripeEnabled,
      mirEnabled: settings.mirEnabled,
      paypalEnabled: settings.paypalEnabled,
      updatedAt: settings.updatedAt,
    },
    methods,
  });
}
