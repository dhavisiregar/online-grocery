# FreshMart — Online Grocery Web App

Final project: a multi-branch grocery e-commerce app. Shoppers see products and
stock from their nearest store branch (resolved from device geolocation);
store admins manage inventory, discounts, and orders per branch; a super
admin manages stores and store admin accounts.

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
- **Email**: `internal/service/mailer.go` logs verification/reset emails to
  the server console when `SMTP_HOST` is unset, so the auth flow is testable
  without a mail server in local dev.
- **Pagination/filtering/sorting** for list endpoints is server-side only
  (`utils.ParsePagination`), per the spec's standardization requirements.

## Feature status

This scaffold prioritizes a working vertical slice (auth + location-based
catalog) plus the full route/data-model surface for the rest, so each
teammate can build directly on top of it instead of starting from scratch.
Endpoints not yet implemented return **HTTP 501** with a descriptive
message instead of failing silently.

### Feature 1 — Homepage, Auth, Address & Shipping, Store Management

| Area | Status |
| --- | --- |
| Landing page (navbar, hero carousel, product list, footer) | ✅ Built |
| Geolocation prompt + nearest-store resolution | ✅ Built (backend + frontend) |
| Register / verify+set-password / login / reset password | ✅ Built end-to-end |
| Profile view + update (name/phone) | ✅ Built (photo upload validation still open) |
| User addresses (CRUD, primary) | ⏳ Routes + UI shell only — `AddressHandler` stubbed |
| Shipping cost calculation (RajaOngkir/OpenCage) | ⏳ Not started |
| Store management (super admin CRUD) | ⏳ List works; create/update/delete stubbed |

### Feature 2 — Admin Accounts, Products, Inventory, Discounts, Reports

| Area | Status |
| --- | --- |
| Admin user/store-admin listing | ✅ Built |
| Store admin create/update/delete | ⏳ Stubbed |
| Product catalog, search, detail (with per-store stock) | ✅ Built |
| Product/category create/update/delete + image upload | ⏳ Stubbed |
| Inventory (stock journal, adjustments) | ⏳ Stubbed — see `models.StockJournal` |
| Discounts (manual/min-purchase/BOGO) + vouchers | ⏳ Stubbed — see `models.Discount`, `models.Voucher` |
| Sales & stock reports | ⏳ Stubbed |

### Feature 3 — Cart, Checkout, Order Tracking, Order Management

| Area | Status |
| --- | --- |
| Cart UI (add/update/remove, navbar badge) | ✅ UI wired to API; `CartHandler` stubbed |
| Checkout shell (address, payment method, order summary) | ✅ UI shell; `OrderHandler.Create` stubbed |
| Payment proof upload (client-side type/size validation) | ✅ UI built; backend stubbed |
| Order list/detail, cancel, confirm receipt | ✅ UI built; backend stubbed |
| Admin order management (confirm payment, ship, cancel) | ✅ UI shell; backend stubbed |

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
