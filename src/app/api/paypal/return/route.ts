import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { capturePaypalOrder } from "@/lib/paypal";
import { finalizeOrderPayment } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const orderNumber = req.nextUrl.searchParams.get("order");
  const origin = req.nextUrl.origin;

  if (!token || !orderNumber) {
    return NextResponse.redirect(`${origin}/checkout?cancelled=paypal`);
  }

  try {
    const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    const order = rows[0];
    if (!order) return NextResponse.redirect(`${origin}/checkout?cancelled=paypal`);

    // Critical: the PayPal token/order id in the URL MUST match the PayPal
    // order id we recorded for THIS order at checkout time. Without this
    // check, an attacker could capture their own (possibly unrelated or
    // cheaper) PayPal order and pass someone else's orderNumber to mark that
    // victim order as paid without ever paying for it.
    if (!order.paypalOrderId || order.paypalOrderId !== token) {
      console.error("PayPal token/order mismatch", { orderNumber, token, expected: order.paypalOrderId });
      return NextResponse.redirect(`${origin}/checkout?cancelled=paypal`);
    }

    if (order.paymentStatus !== "paid") {
      const capture = await capturePaypalOrder(token);

      // Only trust PayPal's own confirmation of the capture outcome — never the
      // mere fact that the user was redirected back to us.
      const captureStatus: string | undefined =
        capture?.status ?? capture?.purchase_units?.[0]?.payments?.captures?.[0]?.status;

      if (captureStatus !== "COMPLETED") {
        console.error("PayPal capture did not complete", orderNumber, captureStatus, capture);
        return NextResponse.redirect(`${origin}/checkout?cancelled=paypal`);
      }

      await finalizeOrderPayment(order.id, "paypal");
    }

    return NextResponse.redirect(`${origin}/checkout/success?order=${orderNumber}`);
  } catch (err) {
    console.error("PayPal capture failed", err);
    return NextResponse.redirect(`${origin}/checkout?cancelled=paypal`);
  }
}
