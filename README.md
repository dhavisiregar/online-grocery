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

## Feature status

This scaffold prioritizes a working vertical slice (auth + location-based
catalog) plus the full route/data-model surface for the rest, so each
teammate can build directly on top of it instead of starting from scratch.
Endpoints not yet implemented return **HTTP 501** with a descriptive
message instead of failing silently.

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
| Admin user/store-admin listing                                     | ✅ Built                                                       |
| Store admin create/update/delete (admin-provisioned, pre-verified) | ✅ Built end-to-end                                            |
| Product catalog, search, detail (with per-store stock)             | ✅ Built                                                       |
| Product/category create/update/delete + multi-image upload         | ✅ Built end-to-end (super admin write, store admin read-only) |
| Inventory (stock journal, adjustments, store-scoped)               | ✅ Built end-to-end                                            |
| Discounts (manual/min-purchase/BOGO) + vouchers                    | ⏳ Stubbed — see `models.Discount`, `models.Voucher`           |
| Sales & stock reports                                              | ⏳ Stubbed                                                     |

### Feature 3 — Cart, Checkout, Order Tracking, Order Management

| Area                                                                 | Status              |
| -------------------------------------------------------------------- | ------------------- |
| Cart (add/update/remove, stock + verified-user checks, navbar badge) | ✅ Built end-to-end |
| Checkout (address selection, shipping estimate, order creation)      | ✅ Built end-to-end |
| Payment proof upload (validated client + server, static-served)      | ✅ Built end-to-end |
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

Every stubbed handler lives in `backend/internal/handlers/*.go` with a
one-line comment on what it needs (e.g. `InventoryHandler.Adjust`,
`OrderHandler.Create`). The route, request/response wiring, and DB models
are already in place — implementing a feature means filling in the
handler body against the existing repository/service layers.

## Environment variables

See `backend/.env.example` and `frontend/.env.local.example`. Notably:

- `RAJAONGKIR_API_KEY` / `OPENCAGE_API_KEY` — needed for Feature 1's
  shipping cost + address geolocation lookups.
- `SMTP_*` — optional; without them, verification/reset emails are logged
  to the backend console instead of sent.
