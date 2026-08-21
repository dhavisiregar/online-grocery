# GrocerGo — Online Grocery Web App

A multi-branch grocery e-commerce app. Shoppers see products and stock from
their nearest store branch (resolved from device geolocation); store admins
manage inventory, discounts, and orders per branch; a super admin manages
stores and store admin accounts.

## Stack

- **Backend**: Go, [Gin](https://github.com/gin-gonic/gin), [GORM](https://gorm.io) on MySQL, JWT auth
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS v4
- **Database**: MySQL

## Repository layout

```
backend/            Go REST API
  cmd/api/           entrypoint (main.go)
  cmd/seed-admin/     CLI to create/promote the first super admin
  internal/
    config/           env var loading
    database/         MySQL connection + AutoMigrate
    models/           GORM models (one domain area per file)
    repository/       DB queries, no business logic
    service/          business logic (auth, nearest-store resolution, mailer)
    handlers/          HTTP handlers, one struct per resource
    middleware/        JWT auth + role guards
    routes/             route wiring
    utils/              JWT, password hashing, geo distance, pagination

frontend/            Next.js app
  src/app/             pages (App Router)
  src/components/      Navbar/Footer, product cards, admin table shells, etc.
  src/contexts/        Auth, Cart, Location (geolocation) React contexts
  src/hooks/           useGeolocation, usePaginatedApi
  src/lib/             API client (lib/api.ts), currency formatting
  src/types/           shared TS types mirroring backend models
```

## Getting started

### Prerequisites

- Go 1.23+
- Node.js 20+
- MySQL 8+ running locally

### Backend

```bash
cd backend
cp .env.example .env        # edit DATABASE_DSN, JWT_SECRET, etc.
mysql -uroot -e "CREATE DATABASE online_grocery CHARACTER SET utf8mb4;"
go run ./cmd/api             # auto-migrates all tables on boot
```

The API listens on `:8080` (see `PORT` in `.env`). `GET /health` should
return `{"status":"ok"}`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL, defaults to :8080
npm install
npm run dev
```

Visit `http://localhost:3000`. The browser will prompt for location access
on first load, per spec — denying it (or an unsupported browser) falls back
to the main store.

### First super admin

Public registration always creates a plain `user` — there's no signup flow
that grants `super_admin`. Provision the first one with the `seed-admin` CLI
(creates the account if the email doesn't exist yet, or promotes it in place
if it does):

```bash
cd backend
go run ./cmd/seed-admin -email you@example.com -password yourpassword -name "Super Admin"
```

## Architecture notes

- **Nearest-store resolution**: `internal/service/store_service.go` picks the
  closest store to given lat/lng (haversine distance) and rejects the
  request (HTTP 422) if the shopper is outside every store's
  `max_distance_km`. The product list/detail endpoints and admin store
  endpoints all funnel through this.
- **Stock is never edited directly**: every stock change is meant to be
  written as a `StockJournal` row first (in/out, with a reference type),
  and `StoreProduct.Stock` derived from it — see the comments in
  `internal/models/inventory.go` and the `InventoryHandler` stub.
- **Auth**: registration creates an unverified user with no password;
  verification + password creation happen together via a one-hour token
  (`internal/service/auth_service.go`). JWT is issued on login and carries
  `user_id` + `role`; `middleware.RequireAuth` / `RequireRole` guard routes.
- **Email**: `internal/service/mailer.go` sends real mail via SMTP when
  `SMTP_HOST` is set (verified locally against a Mailtrap sandbox); with it
  unset, it logs verification/reset emails to the server console instead, so
  the auth flow stays testable without any mail server configured.
- **Pagination/filtering/sorting** for list endpoints is server-side only
  (`utils.ParsePagination`), per the spec's standardization requirements.
- **Order creation**: resolves the nearest store to the _shipping address_
  (not the cart's browsing store), checks stock at that store inside a DB
  transaction, deducts it via `StockJournal` entries, and clears the cart —
  all atomically (`internal/service/order_service.go`). Cancelling restores
  stock the same way, with its own journal entries.
- **Shipping cost** calls the real RajaOngkir/Komerce domestic-cost API
  (`internal/service/rajaongkir_service.go`) when both the store and address
  have a `rajaongkir_destination_id` on file (picked via the destination
  search autocomplete — `/api/destinations/search`, backed by
  `GET .../destination/domestic-destination`). The chosen district is then
  geocoded through OpenCage (`internal/service/geocode_service.go`,
  `/api/geocode`) to auto-fill lat/lng, so the address form no longer needs
  "use current location" as its only source of coordinates. Without a
  destination id on either side (or if the API call fails), it falls back to
  a distance-based placeholder (`internal/service/shipping_service.go`) so
  checkout never hard-fails. The order never trusts a client-supplied
  shipping cost — only the courier+service selection, matched server-side
  against a freshly recomputed rate list (`OrderService.selectShippingOption`).
- **Order deadlines are lazy, not cron-based**: the 1-hour payment window
  and 7-day auto-confirm window are enforced when an order is _read_
  (`OrderService.applyLazyTransitions`), not by a background scheduler.
  Good enough for local dev; swap in a real job runner before production.
- **Payment**: Midtrans Snap is the only payment method — every order is
  created with `payment_method: "midtrans"` (`OrderService.commitOrder`
  hardcodes it; there's no manual-transfer/proof-upload path anymore).
  Checkout gets a Snap token from `POST /api/orders/:id/midtrans-token`
  (`internal/service/midtrans_service.go`), opened client-side via Snap.js.
  Confirmed payment (`settlement`/`capture`+`accept`) skips
  `waiting_confirmation` and goes straight to `processing` — per spec,
  gateway payments don't need manual admin review. `deny`/`cancel`/`expire`
  cancel the order and restore stock the same way a customer cancellation
  does. Two paths feed this: the public webhook
  (`POST /api/payments/midtrans/notification`) for production, and
  `GET /api/orders/:id/payment-status` for local dev, where Midtrans's
  server-to-server webhook can't reach `localhost` — the frontend calls it
  right after the Snap popup reports success/pending. Both verify
  `SHA512(order_id+status_code+gross_amount+server_key)` against Midtrans's
  `signature_key` before trusting anything in the payload, and both funnel
  through the same idempotent transition logic
  (`OrderService.transitionFromMidtransStatus`) — verified against the live
  sandbox API: real Snap token issuance, a forged signature rejected, a
  correctly-signed `settlement` notification processed and safely
  re-delivered without double-applying, and a `deny` notification
  cancelling the order with stock restored via journal.
- **Buy Now**: `POST /api/orders/buy-now` (`OrderService.CreateBuyNow`)
  checks out a single product directly from its detail page, bypassing the
  cart entirely — it never reads or writes `cart_items`, so it can't
  contaminate whatever the shopper already has sitting in their real cart.
  It shares the same store-resolution/shipping/stock-deduction path as the
  normal cart checkout (`commitOrder`, now parameterized by an optional
  cart-to-clear id rather than always assuming one). The checkout page
  detects `?product_id=&store_id=&quantity=` in the URL and switches into
  this mode, reusing the same address/shipping UI.

## Feature status

All three features below are now built end-to-end. One edge is
intentionally left as an **HTTP 501** stub with a descriptive message
instead of failing silently: `UserHandler.UpdateEmail` (changing your login
email requires a re-verification flow that isn't wired up).

### Feature 1 — Homepage, Auth, Address & Shipping, Store Management

| Area                                                       | Status                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Landing page (navbar, hero carousel, product list, footer) | ✅ Built                                                                   |
| Geolocation prompt + nearest-store resolution              | ✅ Built (backend + frontend)                                              |
| Register / verify+set-password / login / reset password    | ✅ Built end-to-end                                                        |
| Profile view + update (name/phone)                         | ✅ Built (photo upload validation still open)                              |
| User addresses (CRUD, primary)                             | ✅ Built end-to-end, incl. "use current location"                          |
| Shipping cost calculation                                  | ✅ Real RajaOngkir rates + OpenCage geocoding (distance fallback if unset) |
| Store management (super admin CRUD + assign store admin)   | ✅ Built end-to-end                                                        |

### Feature 2 — Admin Accounts, Products, Inventory, Discounts, Reports

| Area                                                               | Status                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| Admin user management (list/create/update/delete)                  | ✅ Built end-to-end                                            |
| Store admin create/update/delete (admin-provisioned, pre-verified) | ✅ Built end-to-end                                            |
| Product catalog, search, detail (with per-store stock)             | ✅ Built                                                       |
| Product/category create/update/delete + multi-image upload         | ✅ Built end-to-end (super admin write, store admin read-only) |
| Inventory (stock journal, adjustments, store-scoped)               | ✅ Built end-to-end                                            |
| Discounts (manual/min-purchase/BOGO) + vouchers                    | ✅ Built end-to-end                                            |
| Sales & stock reports                                              | ✅ Built end-to-end                                            |

### Feature 3 — Cart, Checkout, Order Tracking, Order Management

| Area                                                                 | Status              |
| -------------------------------------------------------------------- | ------------------- |
| Cart (add/update/remove, stock + verified-user checks, navbar badge) | ✅ Built end-to-end |
| Buy Now (single-product checkout, skips the cart entirely)           | ✅ Built end-to-end |
| Checkout (address selection, shipping estimate, order creation)      | ✅ Built end-to-end |
| Payment: Midtrans Snap (card/VA/e-wallet/QRIS) — the only method     | ✅ Built end-to-end |
| Order list/detail, cancel, confirm receipt                           | ✅ Built end-to-end |
| Admin order management (confirm payment, ship, cancel), store-scoped | ✅ Built end-to-end |

Verified locally: register → verify → add address → add to cart → checkout
→ upload payment proof → admin approves → admin ships → customer confirms
receipt, with correct stock deduction/restoration at every step. Also
verified: super admin creates a store + category + product (with image) +
store admin account, assigns the store admin to a store, and that store
admin's inventory/product access is correctly scoped and permission-gated.
Also verified against the live RajaOngkir and OpenCage APIs: destination
search, geocoding, real courier rate quotes, weight-aware cost recalculation
on order creation, and the fallback-to-cheapest-option behavior for an
unmatched courier/service.

## UI notes

- **Theming**: manual light/dark mode toggle (`ThemeContext` +
  `components/layout/ThemeToggle.tsx`), persisted client-side and applied
  via an inline head script to avoid a flash/hydration mismatch on load.
- **Alerts**: native `confirm`/`alert` calls have been replaced with
  SweetAlert2 (`lib/alerts.ts`) across the admin screens for confirmations
  and error/success messages.
- **Auth pages**: login and register share a split-screen layout
  (`components/auth/AuthSplitLayout.tsx`).
- **Product form**: supports a multi-image gallery with reordering and
  per-image delete, not just a single upload.

## Deploying (free tier: Vercel + Render + Aiven)

This repo is a monorepo (`backend/` + `frontend/`), so each service's "root
directory" setting matters — don't skip that step below.

**1. Database — [Aiven](https://aiven.io) (free MySQL, no card needed)**

1. Sign up, create a new service → **MySQL**, free plan.
2. Once it's running, open the service's **Overview** tab for the
   connection details (host, port, user — usually `avnadmin` — and
   password), and download the **CA Certificate** from the same page.
3. Easiest: just use the `defaultdb` database Aiven already created (no
   extra step). If you'd rather match local dev's `online_grocery` name,
   connect with any MySQL client and run
   `CREATE DATABASE online_grocery CHARACTER SET utf8mb4;` first.
4. ⚠️ Aiven's free tier **powers off after inactivity and does not
   auto-resume on connection** — you'll get emailed a warning first, but
   if the app suddenly can't reach the database, log into the Aiven
   console and power the service back on manually.

**2. Backend — [Render](https://render.com) (free Go web service)**

The repo includes a `render.yaml` blueprint: **New → Blueprint**, point it
at this GitHub repo, and Render will create the service from it. (Setting
it up by hand works too — Language: Go, Root Directory: `backend`, Build
Command: `go build -o app ./cmd/api`, Start Command: `./app`.)

Fill in the env vars the blueprint marks as "set manually":

- `DATABASE_DSN` — from Aiven's connection details, e.g.
  `avnadmin:PASSWORD@tcp(HOST:PORT)/defaultdb?charset=utf8mb4&parseTime=True&loc=Local&tls=custom`
  — note the `&tls=custom` at the end, required for step 3.
- `DATABASE_CA_CERT` — paste the full contents of the `ca.pem` you
  downloaded from Aiven (multi-line is fine).
- `FRONTEND_BASE_URL` — the Vercel URL from step 3 below (CORS requires
  an exact match, so it's fine to come back and fill this in after).
- `SMTP_*`, `RAJAONGKIR_API_KEY`, `OPENCAGE_API_KEY`, `MIDTRANS_SERVER_KEY`,
  `MIDTRANS_CLIENT_KEY` — same values as your local `backend/.env`.

Deploy, then note the public URL Render gives you (e.g.
`https://grocergo-backend.onrender.com`) — `GET /health` should return
`{"status":"ok"}` once it's live.

⚠️ Render's free web service **sleeps after 15 minutes of no traffic**;
the next request wakes it up but takes 30-60s. Product photo uploads also
live on this service's local disk, which is wiped on every sleep/restart/
redeploy — re-upload product images if they go missing.

**3. Frontend — [Vercel](https://vercel.com)**

Import the repo, set **Root Directory** to `frontend` (Vercel auto-detects
Next.js, no other config needed). Env vars:

- `NEXT_PUBLIC_API_URL` — the Render URL from step 2.
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION`
  — same values as your local `frontend/.env.local`.

Deploy, then go back to Render and set `FRONTEND_BASE_URL` to the Vercel
URL it gives you (e.g. `https://grocergo.vercel.app`), if you hadn't
already — then redeploy the backend so CORS picks it up.

**4. Optional: real Midtrans webhooks**

Locally, Midtrans can't reach `localhost`, so the app relies on the
frontend actively polling `GET /api/orders/:id/payment-status` after the
Snap popup closes. Once deployed, the backend has a real public URL, so
you can set Midtrans's **Payment Notification URL** (sandbox settings) to
`https://<your-render-url>/api/payments/midtrans/notification` for actual
server-to-server webhook delivery instead of relying solely on that poll.

## Environment variables

See `backend/.env.example` and `frontend/.env.local.example`. Notably:

- `RAJAONGKIR_API_KEY` / `OPENCAGE_API_KEY` — needed for Feature 1's
  shipping cost + address geolocation lookups.
- `SMTP_*` — optional; without them, verification/reset emails are logged
  to the backend console instead of sent.
- `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` / `MIDTRANS_ENV` (backend)
  and `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` / `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION`
  (frontend) — **required**; Midtrans is the only payment method, so
  without the server key configured, order creation fails outright. The
  client key is not a secret (Midtrans's Snap.js is designed to take it
  client-side) but the server key must never leave the backend `.env`.
