import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- USERS & AUTH ----------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("customer"), // customer | admin
    phone: varchar("phone", { length: 40 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 191 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 191 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 191 }).notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 191 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  line1: varchar("line1", { length: 191 }).notNull(),
  line2: varchar("line2", { length: 191 }),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }),
  postalCode: varchar("postal_code", { length: 40 }),
  country: varchar("country", { length: 120 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- CATALOG ----------
export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    description: text("description"),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    description: text("description").notNull().default(""),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
    dealPrice: numeric("deal_price", { precision: 10, scale: 2 }),
    dealEndsAt: timestamp("deal_ends_at"),
    sku: varchar("sku", { length: 80 }),
    stock: integer("stock").notNull().default(0),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
    rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    isDeal: boolean("is_deal").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("products_slug_idx").on(table.slug)],
);

// ---------- CART / WISHLIST ----------
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestId: varchar("guest_id", { length: 191 }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- ORDERS ----------
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  // For guest checkouts (userId is null), this stores the guest cookie value that
  // created the order so ownership can still be verified (never rely on the
  // order number alone — it must not be treated as a secret).
  guestId: varchar("guest_id", { length: 191 }),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending|processing|shipped|delivered|cancelled
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("cod"), // cod|stripe|paypal|mir
  paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("unpaid"), // unpaid|paid|failed|refunded
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingFee: numeric("shipping_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  contactEmail: varchar("contact_email", { length: 191 }).notNull(),
  shippingAddress: jsonb("shipping_address").$type<Record<string, string>>().notNull(),
  billingAddress: jsonb("billing_address").$type<Record<string, string>>(),
  notes: text("notes"),
  stripeSessionId: text("stripe_session_id"),
  paypalOrderId: text("paypal_order_id"),
  yookassaPaymentId: text("yookassa_payment_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: varchar("name", { length: 191 }).notNull(),
  image: text("image"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

// ---------- REVIEWS ----------
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    // True only when the reviewer has a paid/delivered order containing this
    // product at the time of submission. Computed server-side — never trust
    // a client-supplied value for this.
    verifiedPurchase: boolean("verified_purchase").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("reviews_product_user_idx").on(table.productId, table.userId)],
);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("percent"), // percent|fixed
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minOrder: numeric("min_order", { precision: 10, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- NOTIFICATIONS ----------
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 191 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 30 }).notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- SETTINGS ----------
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- PAYMENTS ----------
// Owner-controlled enable/disable toggles only. Secrets (API keys) always
// come from environment variables — never stored here or in the client.
export const paymentSettings = pgTable("payment_settings", {
  id: integer("id").primaryKey().default(1),
  stripeEnabled: boolean("stripe_enabled").notNull().default(true),
  mirEnabled: boolean("mir_enabled").notNull().default(true),
  paypalEnabled: boolean("paypal_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
});


