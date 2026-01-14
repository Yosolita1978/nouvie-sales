---
name: nouvie-sales
description: Development skill for Nouvie Sales & Inventory System - a Next.js 16 App Router application for a Colombian cleaning products company. Use when working on customer management, product catalog, order processing, PDF invoices, Excel exports, or any feature involving Colombian localization (COP currency, cédula validation, 19% IVA). Triggers on mentions of Nouvie, Colombian business logic, sales/inventory features, or mobile-first dashboard work.
---

# Nouvie Sales Development Skill

Next.js 16 (App Router) + TypeScript + Prisma + PostgreSQL sales platform for Colombian market.

## Development Rules (ALWAYS FOLLOW)

1. **No fallback mechanisms** — failures must be visible, not hidden
2. **Rewrite components** instead of adding new ones when possible
3. **Flag obsolete files** to keep codebase lightweight
4. **Avoid race conditions** — use proper loading states
5. **Output full files** — never say "X remains unchanged"
6. **Be explicit** on code placement (above/below specific lines)
7. **Mobile-first** — design for 320px width first, enhance for desktop

## Project Structure
```
nouvie-sales/
├── app/
│   ├── (auth)/              # Login (NextAuth credentials)
│   ├── (dashboard)/         # Protected: customers/, dashboard/, orders/, products/
│   └── api/                 # Route handlers per resource
├── components/
│   ├── customers/           # CustomerForm, CustomerList
│   ├── layout/              # Sidebar (desktop), BottomNav (mobile), Header
│   ├── orders/              # OrderForm, ProductPicker, Cart
│   ├── products/            # ProductForm, ProductList
│   └── ui/                  # Modal, ConfirmDialog, LoadingSpinner
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── prisma.ts            # Singleton client
│   ├── utils.ts             # formatCOP, isValidCedula, calculateIVA
│   ├── hooks/               # useCustomers, useProducts, useOrders
│   └── pdf/                 # Invoice templates (@react-pdf/renderer)
├── prisma/schema.prisma     # User, Customer, Product, Order, OrderItem
└── types/                   # TypeScript interfaces
```

## Database Models

See [references/schema.md](references/schema.md) for full Prisma schema.

**Key models:** User (auth), Customer (cedula unique), Product (COP price, stock, category), Order (orderNumber, IVA, paymentStatus, shippingStatus), OrderItem

**Categories:** `Productos | Envases | Etiquetas | Merchandising`
**Payment methods:** `Efectivo | Nequi | Banco | Link`
**Statuses:** `pendiente | pagado` (payment), `pendiente | enviado | entregado` (shipping)

## Colombian Localization
```typescript
// lib/utils.ts patterns
const formatCOP = (n: number) => 
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const isValidCedula = (c: string) => /^\d{8,10}$/.test(c);  // 8-10 digits

const calculateIVA = (subtotal: number) => subtotal * 0.19;  // 19% always

const formatDate = (d: Date) => 
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(d);
```

## API Patterns

See [references/api-patterns.md](references/api-patterns.md) for examples.

**Response format:**
```typescript
// Success
return Response.json({ success: true, data: result });
// Error
return Response.json({ error: 'Message' }, { status: 400 });
```

**Stock deduction:** Only when paymentStatus changes TO `"pagado"` (not before).

## Responsive Patterns
```tsx
{/* Desktop only */}
<div className="hidden md:block">...</div>

{/* Mobile only - bottom nav */}
<div className="md:hidden fixed bottom-0 left-0 right-0">...</div>

{/* Grid responsive */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Key Libraries

| Library | Use |
|---------|-----|
| `@react-pdf/renderer` | Invoice PDF generation (`lib/pdf/`) |
| `ExcelJS` | Order exports with date filtering |
| `NextAuth.js` | Credentials provider auth |
| `Prisma` | PostgreSQL ORM |
| `Tailwind CSS` | Styling (mobile-first) |

## Common Workflows

**New feature:** Check if existing component can extend → if not, create minimal new file
**Bug fix:** Show exact file path + full function code
**New API endpoint:** Copy pattern from existing `/api/[resource]/route.ts`
**UI change:** Test at 320px → 768px → 1024px
**Schema change:** Edit `prisma/schema.prisma` → `npx prisma db push` → update types