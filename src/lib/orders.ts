import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cartItems,
  notifications,
  orderItems,
  orders,
  products,
} from "@/db/schema";
import { sendEmail, orderConfirmationEmailHtml } from "@/lib/mailer";

/**
 * Central ownership check for order access. Never rely on the order number
 * (or any other identifier) being hard to guess — always verify the requester
 * is actually allowed to see this order:
 *  - Admins can access any order.
 *  - Logged-in customers can only access orders tied to their own userId.
 *  - Guest orders (no userId) can only be accessed by the browser holding the
 *    same guest cookie that created the order.
 */
export function canAccessOrder(
  order: { userId: number | null; guestId: string | null },
  requester: { userId: number | null; role: string | null; guestId: string | null },
): boolean {
  if (requester.role === "admin") return true;
  if (order.userId) return requester.userId !== null && requester.userId === order.userId;
  // Guest order: require a matching guest cookie. If the order has no guestId
  // on file (legacy data), deny by default rather than leaking it to anyone.
  return Boolean(order.guestId) && requester.guestId === order.guestId;
}

export class InsufficientStockError extends Error {
  productName: string;
  constructor(productName: string) {
    super(`Insufficient stock for ${productName}`);
    this.productName = productName;
  }
}

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Atomically decrements stock for every cart line inside the given transaction.
 * Uses a conditional UPDATE (stock >= quantity) so concurrent checkouts can never
 * oversell the same product. Throws InsufficientStockError and lets the caller
 * roll back the transaction if any item can no longer be fulfilled.
 */
export async function reserveStockForItems(
  tx: TxClient,
  items: { productId: number; quantity: number; name: string }[],
) {
  for (const item of items) {
    const updated = await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() })
      .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
      .returning({ id: products.id });

    if (updated.length === 0) {
      throw new InsufficientStockError(item.name);
    }
  }
}

/** Restocks previously reserved items (used when an order is cancelled/expired/fails). */
export async function restockItems(
  tx: TxClient,
  items: { productId: number | null; quantity: number }[],
) {
  for (const item of items) {
    if (!item.productId) continue;
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
      .where(eq(products.id, item.productId));
  }
}

/**
 * Idempotently marks an order as paid. Safe to call multiple times (e.g. from both
 * the Stripe webhook and the success-page confirmation call, or from duplicate
 * PayPal/Stripe webhook deliveries) — only the first call has any effect.
 * Stock is NOT decremented here: it is already reserved at order-creation time.
 */
export async function finalizeOrderPayment(
  orderId: number,
  expectedMethod: "cod" | "stripe" | "paypal" | "mir",
): Promise<{ order: typeof orders.$inferSelect; alreadyPaid: boolean } | null> {
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    const order = rows[0];
    if (!order) return null;

    if (order.paymentMethod !== expectedMethod) {
      // Method mismatch — do not trust this confirmation source for this order.
      return null;
    }

    if (order.paymentStatus === "paid") {
      return { order, alreadyPaid: true };
    }

    const [updated] = await tx
      .update(orders)
      .set({ paymentStatus: "paid", status: "processing", updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    if (order.userId) {
      await tx.delete(cartItems).where(eq(cartItems.userId, order.userId));
      await tx.insert(notifications).values({
        userId: order.userId,
        title: "Order confirmed",
        message: `Your order ${order.orderNumber} payment was successful.`,
        type: "order",
      });
    }

    return { order: updated, alreadyPaid: false };
  });

  if (result && !result.alreadyPaid) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, result.order.id));
    const itemsTotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
    await sendEmail(
      result.order.contactEmail,
      `Order confirmation - ${result.order.orderNumber}`,
      orderConfirmationEmailHtml(
        (result.order.shippingAddress as { fullName?: string })?.fullName ?? "Customer",
        result.order.orderNumber,
        `${result.order.currency} ${(itemsTotal || parseFloat(result.order.total)).toFixed(2)}`,
      ),
    );
  }

  return result;
}

/** Clears the guest cart for a given order after a successful guest checkout. */
export async function clearGuestCartForOrder(guestId: string) {
  await db.delete(cartItems).where(and(eq(cartItems.guestId, guestId), isNull(cartItems.userId)));
}

const STALE_ORDER_MINUTES = 30;

/**
 * Best-effort cleanup for pending Stripe/PayPal orders that were abandoned
 * (user closed the tab, session expired, etc). Restocks reserved inventory and
 * marks the order as cancelled so it doesn't hold stock hostage forever.
 * Called opportunistically from checkout and admin order listing.
 */
export async function expireStalePendingOrders() {
  const cutoff = new Date(Date.now() - STALE_ORDER_MINUTES * 60 * 1000);
  const candidates = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.paymentStatus, "unpaid"),
        eq(orders.status, "pending"),
      ),
    );

  for (const order of candidates) {
    if (order.paymentMethod === "cod") continue;
    if (order.createdAt.getTime() > cutoff.getTime()) continue;

    await db.transaction(async (tx) => {
      const rows = await tx.select().from(orders).where(eq(orders.id, order.id)).for("update");
      const current = rows[0];
      if (!current || current.paymentStatus !== "unpaid" || current.status !== "pending") return;

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, current.id));
      await restockItems(tx, items);
      await tx
        .update(orders)
        .set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.id, current.id));
    });
  }
}
