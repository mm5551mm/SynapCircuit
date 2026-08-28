import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, products, orders, orderItems } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser, getOrCreateGuestId } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { generateOrderNumber, toNumber } from "@/lib/utils";
import { getStripe } from "@/lib/stripe";
import { createPaypalOrder } from "@/lib/paypal";
import { createYooKassaPayment } from "@/lib/yookassa";
import { getPaymentMethodsStatus } from "@/lib/paymentSettings";
import { finalizeOrderPayment, reserveStockForItems, restockItems, InsufficientStockError, expireStalePendingOrders } from "@/lib/orders";
import { randomUUID } from "crypto";

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  line1: z.string().min(3),
  line2: z.string().optional().default(""),
  city: z.string().min(1),
  state: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().min(1),
});

const schema = z.object({
  contactEmail: z.string().email(),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["cod", "stripe", "paypal", "mir"]),
  notes: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout data", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Reject unavailable payment methods up front — never accept an order we
  // cannot actually charge, and never touch stock/cart for it. A method is
  // only available when the owner has enabled it AND real provider
  // credentials are configured in the environment.
  if (data.paymentMethod !== "cod") {
    const gatewayMethodId: "card" | "paypal" | "mir" =
      data.paymentMethod === "stripe" ? "card" : data.paymentMethod === "paypal" ? "paypal" : "mir";
    const methods = await getPaymentMethodsStatus();
    const status = methods.find((m) => m.id === gatewayMethodId);
    if (!status?.available) {
      return NextResponse.json(
        { error: "That payment method is temporarily unavailable. Please choose another payment method or try again later." },
        { status: 503 },
      );
    }
  }

  // Best-effort cleanup of abandoned pending gateway orders so their reserved
  // stock is released back into inventory.
  await expireStalePendingOrders().catch((err) => console.error("expireStalePendingOrders failed", err));

  const user = await getCurrentUser();
  const guestId = user ? null : await getOrCreateGuestId();

  const whereExpr = user
    ? eq(cartItems.userId, user.id)
    : and(eq(cartItems.guestId, guestId ?? ""), isNull(cartItems.userId));

  const cart = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(whereExpr);

  if (cart.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  for (const item of cart) {
    if (item.product.stock < item.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${item.product.name}` },
        { status: 400 },
      );
    }
  }

  const settings = await getSettings();
  const subtotal = cart.reduce((sum, item) => {
    const price = item.product.isDeal && item.product.dealPrice
      ? toNumber(item.product.dealPrice)
      : toNumber(item.product.price);
    return sum + price * item.quantity;
  }, 0);
  const shippingFee = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const tax = subtotal * settings.taxRate;
  const total = subtotal + shippingFee + tax;
  const orderNumber = generateOrderNumber();

  // Create the order and atomically reserve stock for every line item in a
  // single transaction. If any product no longer has enough stock (e.g. a
  // concurrent checkout just took the last units), the whole order is rolled
  // back and nothing is charged or reserved — this is what prevents overselling.
  let order: typeof orders.$inferSelect;
  try {
    order = await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: user?.id ?? null,
          guestId: user ? null : guestId,
          status: "pending",
          paymentMethod: data.paymentMethod,
          paymentStatus: "unpaid",
          subtotal: subtotal.toFixed(2),
          shippingFee: shippingFee.toFixed(2),
          tax: tax.toFixed(2),
          discount: "0",
          total: total.toFixed(2),
          currency: settings.currency,
          contactEmail: data.contactEmail,
          shippingAddress: data.shippingAddress,
          notes: data.notes,
        })
        .returning();

      await tx.insert(orderItems).values(
        cart.map((item) => ({
          orderId: createdOrder.id,
          productId: item.product.id,
          name: item.product.name,
          image: item.product.images?.[0] ?? null,
          price: item.product.isDeal && item.product.dealPrice ? item.product.dealPrice : item.product.price,
          quantity: item.quantity,
        })),
      );

      await reserveStockForItems(
        tx,
        cart.map((item) => ({ productId: item.product.id, quantity: item.quantity, name: item.product.name })),
      );

      return createdOrder;
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Failed to create order", err);
    return NextResponse.json({ error: "Could not create order. Please try again." }, { status: 500 });
  }

  const origin = req.nextUrl.origin;

  if (data.paymentMethod === "cod") {
    await finalizeOrderPayment(order.id, "cod");
    await db.delete(cartItems).where(whereExpr);
    return NextResponse.json({ redirectUrl: `/checkout/success?order=${orderNumber}` });
  }

  if (data.paymentMethod === "stripe") {
    try {
      const stripe = getStripe()!;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: data.contactEmail,
        line_items: cart.map((item) => ({
          price_data: {
            currency: settings.currency.toLowerCase(),
            product_data: { name: item.product.name },
            unit_amount: Math.round(
              (item.product.isDeal && item.product.dealPrice
                ? toNumber(item.product.dealPrice)
                : toNumber(item.product.price)) * 100,
            ),
          },
          quantity: item.quantity,
        })),
        shipping_options:
          shippingFee > 0
            ? [
                {
                  shipping_rate_data: {
                    type: "fixed_amount",
                    fixed_amount: { amount: Math.round(shippingFee * 100), currency: settings.currency.toLowerCase() },
                    display_name: "Standard shipping",
                  },
                },
              ]
            : undefined,
        success_url: `${origin}/checkout/success?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?cancelled=stripe`,
        metadata: { orderNumber, orderId: String(order.id) },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      });

      await db
        .update(orders)
        .set({ stripeSessionId: session.id })
        .where(eq(orders.id, order.id));

      return NextResponse.json({ redirectUrl: session.url });
    } catch (err) {
      console.error("Stripe session creation failed", err);
      await rollbackPendingOrder(order.id);
      return NextResponse.json({ error: "Could not start Stripe checkout. Please try again." }, { status: 502 });
    }
  }

  if (data.paymentMethod === "paypal") {
    try {
      const paypalOrder = await createPaypalOrder(
        total,
        settings.currency,
        orderNumber,
        `${origin}/api/paypal/return?order=${orderNumber}`,
        `${origin}/checkout?cancelled=paypal`,
      );
      await db.update(orders).set({ paypalOrderId: paypalOrder.id }).where(eq(orders.id, order.id));
      const approveLink = (paypalOrder.links as { rel: string; href: string }[]).find(
        (l) => l.rel === "approve",
      )?.href;
      if (!approveLink) throw new Error("PayPal did not return an approval link");
      return NextResponse.json({ redirectUrl: approveLink });
    } catch (err) {
      console.error("PayPal order creation failed", err);
      await rollbackPendingOrder(order.id);
      return NextResponse.json({ error: "Could not start PayPal checkout. Please try again." }, { status: 502 });
    }
  }

  if (data.paymentMethod === "mir") {
    try {
      const payment = await createYooKassaPayment({
        amount: total,
        currency: settings.currency,
        orderNumber,
        orderId: order.id,
        returnUrl: `${origin}/checkout/success?order=${orderNumber}`,
        idempotenceKey: randomUUID(),
      });
      await db.update(orders).set({ yookassaPaymentId: payment.id }).where(eq(orders.id, order.id));
      const confirmationUrl = payment.confirmation?.confirmation_url;
      if (!confirmationUrl) throw new Error("YooKassa did not return a confirmation URL");
      return NextResponse.json({ redirectUrl: confirmationUrl });
    } catch (err) {
      console.error("YooKassa payment creation failed", err);
      await rollbackPendingOrder(order.id);
      return NextResponse.json({ error: "Could not start MIR checkout. Please try again." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
}

/** Restocks and cancels an order whose payment session could not be created. */
async function rollbackPendingOrder(orderId: number) {
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      const order = rows[0];
      if (!order || order.paymentStatus !== "unpaid") return;
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      await restockItems(tx, items);
      await tx
        .update(orders)
        .set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });
  } catch (err) {
    console.error("Failed to rollback pending order", orderId, err);
  }
}
