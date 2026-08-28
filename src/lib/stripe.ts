import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
