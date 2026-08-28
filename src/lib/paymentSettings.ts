import { db } from "@/db";
import { paymentSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isStripeConfigured } from "@/lib/stripe";
import { isPaypalConfigured } from "@/lib/paypal";
import { isYooKassaConfigured } from "@/lib/yookassa";

export type PaymentSettingsRow = typeof paymentSettings.$inferSelect;

/** Reads the singleton payment settings row, creating it with safe defaults
 * the first time the app runs. This is what makes owner on/off toggles
 * survive an application restart — they live in Postgres, never in memory. */
export async function getPaymentSettings(): Promise<PaymentSettingsRow> {
  const rows = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 1)).limit(1);
  if (rows[0]) return rows[0];

  const inserted = await db
    .insert(paymentSettings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];

  const retry = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 1)).limit(1);
  return retry[0];
}

export async function updatePaymentSettings(
  input: Partial<Pick<PaymentSettingsRow, "stripeEnabled" | "mirEnabled" | "paypalEnabled">>,
  adminId: number,
): Promise<PaymentSettingsRow> {
  await getPaymentSettings();
  const updated = await db
    .update(paymentSettings)
    .set({ ...input, updatedAt: new Date(), updatedBy: adminId })
    .where(eq(paymentSettings.id, 1))
    .returning();
  return updated[0];
}

export type PaymentMethodStatus = {
  id: "cod" | "card" | "mir" | "paypal";
  label: string;
  description: string;
  networks?: string[];
  configured: boolean;
  enabled: boolean;
  available: boolean;
};

/** Combines owner toggles (DB) with provider credential availability (env)
 * to compute what is actually usable right now. COD is always available. */
export async function getPaymentMethodsStatus(): Promise<PaymentMethodStatus[]> {
  const settings = await getPaymentSettings();
  const stripeConfigured = isStripeConfigured();
  const yookassaConfigured = isYooKassaConfigured();
  const paypalConfigured = isPaypalConfigured();

  return [
    {
      id: "cod",
      label: "Cash on Delivery",
      description: "Pay when your order arrives.",
      configured: true,
      enabled: true,
      available: true,
    },
    {
      id: "card",
      label: "Visa / Mastercard",
      description: "Card payments processed securely through Stripe Checkout.",
      networks: ["Visa", "Mastercard"],
      configured: stripeConfigured,
      enabled: settings.stripeEnabled,
      available: stripeConfigured && settings.stripeEnabled,
    },
    {
      id: "mir",
      label: "MIR",
      description: "MIR card payments processed through YooKassa, a Russian payment gateway supporting the MIR payment system.",
      networks: ["MIR"],
      configured: yookassaConfigured,
      enabled: settings.mirEnabled,
      available: yookassaConfigured && settings.mirEnabled,
    },
    {
      id: "paypal",
      label: "PayPal",
      description: "Pay securely with your PayPal account via PayPal Checkout.",
      configured: paypalConfigured,
      enabled: settings.paypalEnabled,
      available: paypalConfigured && settings.paypalEnabled,
    },
  ];
}
