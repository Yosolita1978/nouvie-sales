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