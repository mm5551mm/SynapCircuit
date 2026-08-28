# SynapCircuit

A full-stack e-commerce storefront for electronics/maker components, built with
Next.js (App Router), PostgreSQL and Drizzle ORM. Includes customer storefront
(catalog, cart, wishlist, checkout with COD/Stripe/PayPal), authenticated
accounts with email verification and password reset, and a full admin panel
(products, categories, orders, customers, settings).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Environment Variables](#environment-variables)
4. [PostgreSQL Setup](#postgresql-setup)
5. [Database Schema / Migrations](#database-schema--migrations)
6. [Seeding the Database](#seeding-the-database)
7. [Development](#development)
8. [Production Build & Start](#production-build--start)
9. [SMTP / Email Setup](#smtp--email-setup)
10. [Stripe Setup](#stripe-setup)
11. [Stripe Webhook Setup](#stripe-webhook-setup)
12. [PayPal Setup](#paypal-setup)
13. [Deployment](#deployment)
14. [Security Notes](#security-notes)
15. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js 20.9+** (Node 22 LTS recommended — this project is built/tested
  against Node 22).
- **npm 10+** (ships with Node 20/22).
- **PostgreSQL 14+** running locally or reachable over the network.
- (Optional) A Stripe account for card payments.
- (Optional) A PayPal Developer account for PayPal payments.
- (Optional) An SMTP account/relay (e.g. Mailgun, SendGrid SMTP, Postmark,
  Gmail App Password, or a local dev SMTP like Mailhog) for outbound email.

## Project Setup

```bash
# Install dependencies (uses the committed package-lock.json for a
# reproducible install)
npm install

# Copy the environment template and fill in real values
cp .env.example .env
```

## Environment Variables

All variables actually read by the source code are documented in
[`.env.example`](./.env.example). Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string used by Drizzle ORM. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Recommended | Outbound email for verification/reset/order emails. |
| `MAIL_FROM` | No | "From" header for outgoing emails. |
| `STRIPE_SECRET_KEY` | No (required for card payments) | Enables the Stripe Checkout payment method. |
| `STRIPE_WEBHOOK_SECRET` | No (required for card payments) | Verifies signatures on `/api/webhooks/stripe`. |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` | No (required for PayPal) | Enables the PayPal payment method. |
| `PAYPAL_API_BASE` | No | `https://api-m.sandbox.paypal.com` (default) or `https://api-m.paypal.com` for live. |
| `NODE_ENV` | No | `development` / `production`. |

**Important:** Stripe and PayPal are only offered as checkout options when
their credentials are configured (`isStripeConfigured()` /
`isPaypalConfigured()`). If a customer attempts to check out with an
unconfigured gateway, the API rejects the request with `503` — orders are
**never** silently marked as paid without a verified payment from the actual
gateway. Cash on Delivery (COD) is a legitimate always-available payment
method that does not require external configuration.

## PostgreSQL Setup

### Option A — Local install

```bash
# Debian/Ubuntu
sudo apt-get install postgresql

# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16
```

Create the database and user referenced by `DATABASE_URL`:

```bash
psql -U postgres -c "CREATE DATABASE app_db;"
```

### Option B — Docker

```bash
docker run --name synapcircuit-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app_db \
  -p 5432:5432 \
  -d postgres:16
```

Then set in `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

## Database Schema / Migrations

The schema is defined in `src/db/schema.ts` using Drizzle ORM. This project
uses `drizzle-kit push` for schema sync (no separate migration files are
checked in), which is ideal for getting a fresh environment running quickly:

```bash
npx drizzle-kit push
```

This creates/updates all tables (`users`, `sessions`,
`email_verification_tokens`, `password_reset_tokens`, `addresses`,
`categories`, `products`, `reviews`, `cart_items`, `wishlist_items`, `orders`,
`order_items`, `coupons`, `notifications`, `settings`) with their foreign
keys, unique constraints and indexes.

> If you prefer versioned migrations for a team/production workflow, you can
> switch to `drizzle-kit generate` + `drizzle-kit migrate` — the schema file
> is fully compatible with either workflow.

## Seeding the Database

A seed script populates categories, ~20 sample products, store settings, and
two demo accounts:

```bash
npx tsx scripts/seed.ts
```

This creates:
- **Admin:** `admin@synapcircuit.com` / `Admin@12345`
- **Demo customer:** `customer@synapcircuit.com` / `Customer@12345`

**Change or remove these demo accounts before going to production.** The seed
script is idempotent — re-running it will not duplicate existing categories,
products, or users.

## Development

```bash
npm run dev
```

The app starts on [http://localhost:3000](http://localhost:3000).

## Production Build & Start

```bash
npm run build
npm run start
```

`npm run build` runs Next.js's production build (including a TypeScript type
check). `npm run start` serves the compiled production build. Set `NODE_ENV=production`
in your environment for the process manager/host running `npm run start`.

Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
```

## SMTP / Email Setup

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (and optionally
`MAIL_FROM`) in `.env`. The app uses `nodemailer` (`src/lib/mailer.ts`) to
send:

- Email verification links (on registration and via "resend verification")
- Password reset links (1-hour expiry)
- Order confirmation emails (on successful payment)

**Behavior when SMTP is not configured:**
- In `development`, emails are logged to the server console so you can copy
  verification/reset links manually.
- In `production`, the app logs a loud `console.error` and returns
  `delivered: false` — it **never pretends** the email was sent. Configure
  SMTP before going live, otherwise verification and password-reset emails
  will not reach users.

Any standard SMTP provider works: Mailgun, SendGrid, Postmark, Amazon SES
(SMTP interface), or a Gmail account with an App Password. For local testing
you can run [Mailpit](https://github.com/axllent/mailpit) or
[Mailhog](https://github.com/mailhog/MailHog) and point `SMTP_HOST` at it.

## Stripe Setup

1. Create a [Stripe account](https://dashboard.stripe.com/register) (test mode
   is fine for development).
2. Copy your **Secret key** from Developers → API keys and set
   `STRIPE_SECRET_KEY` in `.env`.
3. That's it for basic Checkout — the app creates a Stripe Checkout Session
   server-side (`src/app/api/checkout/route.ts`) with a 30-minute expiry and
   redirects the customer to Stripe's hosted payment page.

Without `STRIPE_SECRET_KEY` set, the "Credit / Debit Card (Stripe)" option is
rejected at checkout with a `503` — the app never fabricates a paid order.

## Stripe Webhook Setup

Payment confirmation is verified two ways, both independently re-verifying
payment status directly with Stripe (never trusting the client redirect
alone):

1. **Webhook (source of truth):** `POST /api/webhooks/stripe` handles
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   and `checkout.session.expired` events.
2. **Success-page confirmation (fast UX path):** when the customer is
   redirected back to `/checkout/success`, the app calls
   `/api/checkout/confirm-stripe` which re-fetches the session from Stripe's
   API before marking anything paid.

Both paths call the same idempotent `finalizeOrderPayment()` helper, so
duplicate webhook retries or a race between the webhook and the success page
can never double-process a payment, double-decrement stock, or send a
duplicate confirmation email.

### Configure the webhook

**Local development** (using the Stripe CLI):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed "whsec_..." into STRIPE_WEBHOOK_SECRET in .env
```

**Production:**

1. In the Stripe Dashboard → Developers → Webhooks → *Add endpoint*.
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events to send: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.expired`.
4. Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

Without `STRIPE_WEBHOOK_SECRET` configured, the webhook endpoint rejects all
requests with `400` rather than accepting unverified/unsigned payloads.

## PayPal Setup

1. Create an app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)
   (Sandbox for testing, Live for production).
2. Copy the **Client ID** and **Secret** into `PAYPAL_CLIENT_ID` /
   `PAYPAL_SECRET`.
3. Set `PAYPAL_API_BASE` to `https://api-m.sandbox.paypal.com` (default) for
   testing, or `https://api-m.paypal.com` for production.

The checkout flow creates a PayPal order server-side, redirects the customer
to PayPal to approve it, then PayPal redirects back to
`/api/paypal/return?token=<paypal_order_id>&order=<orderNumber>`. That route:

- Looks up the order by `orderNumber`.
- **Verifies `token` matches the `paypalOrderId` stored on that order** before
  ever calling PayPal's capture API — this prevents a manipulated `order`
  query parameter from marking an unrelated order as paid using a capture of
  a different PayPal order.
- Captures the payment directly via PayPal's API and only finalizes the order
  if PayPal reports the capture status as `COMPLETED`.

Without PayPal credentials configured, the "PayPal" option is rejected at
checkout with a `503`.

## Deployment

This is a standard Next.js app and can be deployed to any Node.js host
(Vercel, Render, Railway, Fly.io, a VPS with PM2/systemd, Docker, etc.).

General steps:

1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. Set all required environment variables (see `.env.example`) on the host.
3. Run `npm install` (or let the platform run it) to install dependencies
   from `package-lock.json`.
4. Run `npx drizzle-kit push` against the production database (or your
   migration pipeline of choice) to create the schema.
5. Optionally run `npx tsx scripts/seed.ts` once to create the initial admin
   account and catalog — then **immediately change the seeded admin
   password**.
6. Run `npm run build` then `npm run start` (or let your platform run these
   as the build/start commands). Ensure `NODE_ENV=production`.
7. Point your Stripe and PayPal webhook/return URLs at your public domain.
8. Configure SMTP so verification/reset/order emails actually deliver.

### Docker (example)

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx next typegen && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Security Notes

This project has undergone a security/correctness audit covering:

- **Order access control:** every order-reading endpoint/page
  (`/api/orders/[id]`, `/checkout/success`, `/account/orders/[id]`,
  `/api/checkout/confirm-stripe`) verifies the requester actually owns the
  order (by session user id, or by a guest cookie recorded at order-creation
  time for guest checkouts) — order numbers are never treated as secrets.
- **PayPal capture integrity:** `/api/paypal/return` refuses to capture a
  payment unless the `token` query parameter matches the `paypalOrderId`
  stored for that specific order.
- **Stripe payment verification:** both the webhook and the success-page
  confirmation endpoint always re-verify payment status directly against
  Stripe's API rather than trusting the redirect/webhook payload.
- **Idempotent payment finalization:** `finalizeOrderPayment()` is guarded by
  a row lock and a `paymentStatus === "paid"` check so retries/races can never
  double-decrement stock or send duplicate confirmation emails.
- **Atomic stock reservation:** stock is decremented with a conditional
  `UPDATE ... WHERE stock >= quantity` inside a transaction, so concurrent
  checkouts can never oversell the same inventory. Cancellations/refunds
  restock exactly once (guarded by the order's previous status).
- **Admin authorization:** every `/api/admin/*` route and every `/admin/*`
  page (via `src/app/admin/(protected)/layout.tsx`) requires a session with
  `role === "admin"`; the admin login page itself lives outside that
  protected layout to avoid any redirect loop.
- **Upload hardening:** `/api/upload` requires an admin session, validates
  MIME type against an allow-list, enforces a 5MB size limit, and generates a
  random server-side filename (never trusting the client-provided filename).
- **Auth hardening:** passwords hashed with bcrypt; session/verification/reset
  tokens are cryptographically random and single-use with expiry; password
  reset invalidates all existing sessions; login/forgot-password responses
  avoid leaking whether an email is registered.

## Troubleshooting

**`DATABASE_URL is required` on startup**
Ensure `.env` exists and `DATABASE_URL` is set before starting the app.

**`relation "users" does not exist` (or similar) errors**
Run `npx drizzle-kit push` to sync the schema to your database.

**Verification/reset emails never arrive**
Check `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are set correctly. In development
with no SMTP configured, check the server console/log — the email content and
link are printed there instead of being sent.

**"Card payments are temporarily unavailable" at checkout**
`STRIPE_SECRET_KEY` is not set. Add it to `.env` and restart the server.

**"PayPal is temporarily unavailable" at checkout**
`PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` are not set. Add them to `.env` and
restart the server.

**Stripe webhook returns 400 `"Invalid signature"`**
`STRIPE_WEBHOOK_SECRET` doesn't match the endpoint's signing secret. Re-copy
it from the Stripe Dashboard (or `stripe listen` output) into `.env`.

**Orders stuck as "pending"/"unpaid" after a Stripe/PayPal redirect**
Confirm the webhook is registered and reachable (Stripe Dashboard → Webhooks
→ recent deliveries), and that `expireStalePendingOrders()` (called from
checkout/admin order listing) hasn't already expired the order after 30
minutes of inactivity — expired gateway orders are cancelled and their stock
is restocked automatically.

**`npm run build` fails with a TypeScript error about `.next/types`**
Run `npx next typegen` first to regenerate route types, then re-run the
build.

**Admin login redirects in a loop**
Make sure you're on the version of the app where `/admin/login` lives outside
the `(protected)` route group (`src/app/admin/(protected)/layout.tsx` only
wraps the dashboard routes, not the login page).
