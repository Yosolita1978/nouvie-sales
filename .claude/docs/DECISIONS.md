# Technical Decisions Log

Append new decisions at the top. Include [SHARED] tag if it affects both nouvie-sales and nouvie-web.

---

## Template
```
## YYYY-MM-DD: Decision title [SHARED if applicable]

**Context**: Why this came up
**Options considered**: What alternatives existed
**Decision**: What you chose
**Trade-off**: What you gave up
**Affects**: Which files/features
```

---

## 2026-05-29: Estadísticas analytics view — queries + CSS bars (n8n groundwork)

**Context**: Client wanted an at-a-glance view of best-selling products and top customers, with AI alerts (via n8n) as a planned second step. Nothing like it existed; the dashboard only showed today's counts.
**Options considered**: (A) Per-metric API routes vs one combined `/api/stats`; (B) Visuals via a chart library (recharts) vs plain CSS bars; (C) all-time totals vs a month filter.
**Decision**: One combined read-only `GET /api/stats?month=YYYY-MM` (parallel `groupBy` queries, same pattern as `/api/dashboard`); plain Tailwind CSS bars (no new dependency, readable for a non-tech admin); month dropdown reusing the existing `/api/orders/months` endpoint. `salesByMonth` deliberately ignores the month filter — a trend needs many months.
**Trade-off**: CSS bars are less fancy than real charts; the single endpoint returns more data than any one widget needs. Both acceptable for v1 and keep the surface small for n8n to consume later.
**Affects**: `app/api/stats/route.ts` (new), `app/(dashboard)/stats/page.tsx` (new), `lib/utils.ts` (`formatMonthLabel`), `components/layout/Sidebar.tsx` (nav), `.claude/docs/HANDOFF.md` (Estadísticas section)

---

## 2026-04-21: Kit Reparación Intensa & Revitalizante price update [SHARED]

**Context**: Follow-up to the morning session's ML-alignment update. Client confirmed new prices for the two kits that had been left pending: Reparación Intensa ($158,000 → $188,000) and Revitalizante ($96,000 → $116,800). This closes out the kit pricing discrepancy flagged in the earlier DECISIONS entry.
**Options considered**: (A) Edit `add-treatment-bundles.ts` in place and re-run it, (B) Create a separate one-off update script and also fix the stale constants in `add-treatment-bundles.ts` so it stays consistent
**Decision**: Option B. New script `scripts/update-kit-prices-apr2026.ts` following the `update-stock-feb2026.ts` pattern (name-based lookup, before/after logging, verification). Also updated constants in `add-treatment-bundles.ts` to match, so re-running it does not revert prices.
**Trade-off**: Two scripts now contain the same prices — must update both if prices change again. Worth it because the dated script documents the change moment and is safely idempotent.
**Affects**: `nouvie-sales/scripts/update-kit-prices-apr2026.ts` (new), `nouvie-sales/scripts/add-treatment-bundles.ts` (constants), `nouvie-web/lib/product-data.ts` (bundlePrice lines 328 and 362), `nouvie-sales/.claude/docs/HANDOFF.md` (client price table)

---

## 2026-04-21: Capilar price update — Mercado Libre alignment [SHARED]

**Context**: Client provided new retail prices from their Mercado Libre listings. All capilar product prices increased significantly (shampoos +37%, mascarillas +42%, lociones +42%, Kit Suave y Liso +19%). Product names on ML differ from system names (e.g. "Molding" = "Locion", "Karite" = "Reparacion Intensa").
**Options considered**: (A) Update only the 8 specific ML products, (B) Update all capilar products uniformly since the system uses uniform pricing per type
**Decision**: Updated all capilar products uniformly — all shampoos to $68,000, all mascarillas to $88,000, all lociones to $78,000 (con IVA). Kit Suave y Liso to $188,000. PromoMix promo prices recalculated keeping the same 0.714 ratio. Kit Reparacion Intensa and Kit Revitalizante left unchanged (not in ML data).
**Trade-off**: Kit Reparacion Intensa and Kit Revitalizante may need a separate update if the client provides new prices for those
**Affects**: `scripts/verify-all-prices.ts`, `scripts/fix-capilar-products.ts`, `scripts/add-treatment-bundles.ts`, `lib/promomix-config.ts` (both projects), `nouvie-web/lib/product-data.ts`

---

## 2026-04-14: Monthly orders view route structure

**Context**: Needed a `/orders/[month]` route to view orders by month, but `/orders/[id]` already exists for order detail
**Options considered**: (A) `/orders/[month]` with param detection logic, (B) `/orders/month/[month]` nested route
**Decision**: Used `/orders/month/[month]` to avoid ambiguity with the existing `/orders/[id]` dynamic route
**Trade-off**: Slightly longer URL, but zero risk of route conflicts
**Affects**: `app/(dashboard)/orders/month/[month]/page.tsx`

---

## 2026-04-14: Dynamic month navigation from database

**Context**: Month navigation on the orders page initially showed a hardcoded last 6 months, but some months may have no orders
**Options considered**: (A) Hardcoded last 6 months, (B) Query DB for months with orders
**Decision**: Created `/api/orders/months` that queries distinct year/month from the orders table. Navigation only renders months that have data.
**Trade-off**: Extra API call on page load, but lightweight (single GROUP BY query) and avoids showing empty months
**Affects**: `app/api/orders/months/route.ts`, `app/(dashboard)/orders/page.tsx`

---

## 2026-02-18: ExchangeRate model for USD pricing [SHARED]

**Context**: nouvie-web needs to display product prices in USD for international visitors
**Options considered**: (A) Hardcode conversion rate in web code, (B) Store rate in DB with ExchangeRate model, (C) Use a live API for real-time rates
**Decision**: New `exchange_rates` table with currency + rate columns. Seeded with 1 USD = 3,660.25 COP (Banco de la República market average). Updated monthly.
**Trade-off**: Rate must be updated manually each month; not real-time but predictable and simple
**Affects**: `prisma/schema.prisma` (both projects), Supabase `exchange_rates` table, future nouvie-web pricing display

---

## 2026-02-17: Supabase connection URL migration to pooler [SHARED]

**Context**: Supabase deprecated the direct database host (`db.wkuhamnniaulkxgrzndl.supabase.co`), connection started failing
**Options considered**: (A) Use new pooler URL with port 5432 (session mode), (B) Use pooler with port 6543 (transaction mode)
**Decision**: Local dev uses port 5432 (session mode). Vercel should use port 6543 (transaction mode, better for serverless).
**Trade-off**: Two different ports for local vs production; must keep both in sync
**Affects**: `.env`, `.env.local`, Vercel environment variables for both nouvie-sales and nouvie-web

---

## 2026-02-17: Institutional prices stored as PRECIO SUGERIDO VENTA PUBLICO / 1.19

**Context**: Client provided 2026 institutional price list with "Precio Sugerido Venta Público" (includes IVA)
**Options considered**: Store as-is vs. store sin IVA
**Decision**: Consistent with existing convention — all DB prices stored sin IVA (÷ 1.19), IVA applied at display/order time
**Trade-off**: Must remember to divide client prices by 1.19 when updating DB
**Affects**: All institutional product prices in DB, `scripts/update-institucional-2026.ts`

---

## 2026-01-30: PromoMix product matching by DB name [SHARED]

**Context**: PromoMix config needs to identify which DB products are eligible for discounts
**Options considered**: (A) Store DB product UUIDs in config, (B) Match by product name, (C) Add a promomix flag to Product model
**Decision**: Match by product name using `findPromoMixByName()` (case-insensitive exact match)
**Trade-off**: If a product name changes in DB, the config must be updated manually. Simpler than adding DB flags or managing UUIDs.
**Affects**: `lib/promomix-config.ts`, `app/api/orders/route.ts`, `components/orders/ProductPicker.tsx`

---

## 2026-01-30: Used prisma db push instead of migrate [SHARED]

**Context**: Adding `orderType` field to Order model, but DB has no migration history (was set up with `db push`)
**Options considered**: (A) `prisma migrate dev` (requires reset), (B) `prisma db push` (applies directly)
**Decision**: Used `prisma db push` to avoid data loss on production database
**Trade-off**: No migration file in version control; future schema changes should also use `db push` unless migration history is bootstrapped
**Affects**: `prisma/schema.prisma`, Supabase `orders` table

---

## 2026-01-30: PromoMix pricing — server as source of truth

**Context**: When creating a PromoMix order, promo prices could come from the client or the server
**Options considered**: (A) Trust client-sent prices, (B) Server overrides prices using config
**Decision**: Server always overrides unit prices with promo prices from `promomix-config.ts` for PromoMix orders
**Trade-off**: Slightly more server processing, but prevents price manipulation from the client
**Affects**: `app/api/orders/route.ts`

---

## 2025-01-13: Shared database instance [SHARED]

**Context**: Two projects need product and customer data
**Options considered**: Separate databases, shared database
**Decision**: Single PostgreSQL instance for both projects
**Trade-off**: Downtime affects both; schema changes need coordination
**Affects**: nouvie-sales + nouvie-web, all Prisma operations