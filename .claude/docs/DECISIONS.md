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