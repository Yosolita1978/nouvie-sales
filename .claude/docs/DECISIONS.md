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

## 2025-01-13: Shared database instance [SHARED]

**Context**: Two projects need product and customer data
**Options considered**: Separate databases, shared database
**Decision**: Single PostgreSQL instance for both projects
**Trade-off**: Downtime affects both; schema changes need coordination
**Affects**: nouvie-sales + nouvie-web, all Prisma operations