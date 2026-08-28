const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

export function isPaypalConfigured() {
  return Boolean(PAYPAL_CLIENT_ID && PAYPAL_SECRET);
}

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Failed to authenticate with PayPal");
  const data = await res.json();
  return data.access_token as string;
}

export async function createPaypalOrder(
  amount: number,
  currency: string,
  orderNumber: string,
  returnUrl?: string,
  cancelUrl?: string,
) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: orderNumber,
          amount: { currency_code: currency, value: amount.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "SynapCircuit",
        user_action: "PAY_NOW",
        ...(returnUrl ? { return_url: returnUrl } : {}),
        ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal order creation failed: ${text}`);
  }
  return res.json();
}

export async function capturePaypalOrder(paypalOrderId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed: ${text}`);
  }
  return res.json();
}
