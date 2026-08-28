import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  currency: string;
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SynapCircuit",
  supportEmail: "support@synapcircuit.com",
  currency: "USD",
  taxRate: 0.08,
  shippingFee: 6.99,
  freeShippingThreshold: 75,
};

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings).where(eq(settings.key, "store"));
  if (!rows[0]) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(rows[0].value as Partial<StoreSettings>) };
}

export async function updateSettings(patch: Partial<StoreSettings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db
    .insert(settings)
    .values({ key: "store", value: next })
    .onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } });
  return next;
}
