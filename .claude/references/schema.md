# Prisma Schema Reference

## Full Schema
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcryptjs hashed
  name      String?
  createdAt DateTime @default(now())
}

model Customer {
  id        String   @id @default(cuid())
  cedula    String   @unique  // Colombian ID, 8-10 digits
  name      String
  phone     String?
  email     String?
  address   String?
  orders    Order[]
  createdAt DateTime @default(now())
}

model Product {
  id          String      @id @default(cuid())
  name        String
  description String?
  price       Decimal     // COP (Colombian Pesos), no decimals needed
  stock       Int         @default(0)
  category    String      // Productos | Envases | Etiquetas | Merchandising
  isActive    Boolean     @default(true)
  orderItems  OrderItem[]
  createdAt   DateTime    @default(now())
}

model Order {
  id             String      @id @default(cuid())
  orderNumber    String      @unique  // Format: ORD-YYYYMMDD-XXX
  customer       Customer    @relation(fields: [customerId], references: [id])
  customerId     String
  items          OrderItem[]
  subtotal       Decimal
  iva            Decimal     // 19% of subtotal
  total          Decimal     // subtotal + iva
  paymentMethod  String      // Efectivo | Nequi | Banco | Link
  paymentStatus  String      @default("pendiente")  // pendiente | pagado
  shippingStatus String      @default("pendiente")  // pendiente | enviado | entregado
  notes          String?
  createdAt      DateTime    @default(now())
}

model OrderItem {
  id        String  @id @default(cuid())
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  unitPrice Decimal  // Price at time of order (snapshot)
  total     Decimal  // quantity * unitPrice
}
```

## Order Number Generation
```typescript
const generateOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;
  
  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' }
  });
  
  const nextNum = lastOrder 
    ? parseInt(lastOrder.orderNumber.slice(-3)) + 1 
    : 1;
  
  return `${prefix}${nextNum.toString().padStart(3, '0')}`;
};
```

## Stock Deduction Logic

Stock is ONLY deducted when payment status changes to "pagado":
```typescript
// In PATCH /api/orders/[id]/route.ts
if (body.paymentStatus === 'pagado' && existingOrder.paymentStatus !== 'pagado') {
  // Deduct stock for all items
  for (const item of existingOrder.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    });
  }
}
```

## Prisma Client Singleton
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```