import { NextResponse } from "next/server";
import { getPaymentMethodsStatus } from "@/lib/paymentSettings";

export const dynamic = "force-dynamic";

// Public endpoint: only ever exposes which methods are actually available
// (enabled by the owner AND configured with real provider credentials).
// Never exposes secrets or raw settings.
export async function GET() {
  const methods = await getPaymentMethodsStatus();
  const available = methods
    .filter((m) => m.available)
    .map((m) => ({ id: m.id, label: m.label, description: m.description, networks: m.networks ?? [] }));

  return NextResponse.json({ methods: available });
}
