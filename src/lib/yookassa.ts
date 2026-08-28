// YooKassa (yookassa.ru) is a real Russian payment gateway that natively
// supports MIR cards (as well as Visa/Mastercard issued in Russia). It is
// used specifically for the "MIR" payment method rather than pretending a
// non-Russian processor like Stripe can process MIR, which it cannot.
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const API_BASE = "https://api.yookassa.ru/v3";

export function isYooKassaConfigured() {
  return Boolean(YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY);
}

function authHeader(): string {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error("YooKassa is not configured: YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY are missing.");
  }
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64")}`;
}

export interface YooKassaPayment {
  id: string;
  status: string; // pending | waiting_for_capture | succeeded | canceled
  paid: boolean;
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
}

export async function createYooKassaPayment(input: {
  amount: number; // major currency units, e.g. dollars/rubles
  currency: string;
  orderNumber: string;
  orderId: number;
  returnUrl: string;
  idempotenceKey: string;
}): Promise<YooKassaPayment> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotence-Key": input.idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value: input.amount.toFixed(2), currency: input.currency.toUpperCase() },
      capture: true,
      confirmation: { type: "redirect", return_url: input.returnUrl },
      description: `Order ${input.orderNumber}`,
      metadata: { order_id: String(input.orderId), order_number: input.orderNumber },
      payment_method_data: { type: "bank_card" },
    }),
    cache: "no-store",
  });
  const data = (await res.json()) as YooKassaPayment;
  if (!res.ok) {
    throw new Error(`Failed to create YooKassa payment: ${JSON.stringify(data)}`);
  }
  return data;
}

/** Always re-fetches the authoritative payment status directly from the
 * YooKassa API rather than trusting webhook payloads or redirect URLs, since
 * YooKassa notifications are not HMAC-signed by default. This is YooKassa's
 * own recommended verification approach. */
export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  const data = (await res.json()) as YooKassaPayment;
  if (!res.ok) {
    throw new Error(`Failed to fetch YooKassa payment: ${JSON.stringify(data)}`);
  }
  return data;
}
