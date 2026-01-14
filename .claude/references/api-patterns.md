# API Patterns Reference

## Route Structure
```
app/api/
├── customers/
│   ├── route.ts           # GET (list/search), POST (create)
│   └── [id]/route.ts      # GET, DELETE
├── products/
│   ├── route.ts           # GET (list/filter), POST (create)
│   └── [id]/route.ts      # GET, DELETE
├── orders/
│   ├── route.ts           # GET (list/filter), POST (create)
│   ├── [id]/
│   │   ├── route.ts       # GET, PATCH (status), DELETE
│   │   └── pdf/route.ts   # GET (download invoice)
│   └── export/route.ts    # GET (Excel export)
└── dashboard/route.ts     # GET (stats)
```

## Collection Route Pattern
```typescript
// app/api/customers/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';

  const customers = await prisma.customer.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { cedula: { contains: search } }
      ]
    } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } }
  });

  return NextResponse.json({ success: true, data: customers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.cedula) {
      return NextResponse.json(
        { error: 'Nombre y cédula son requeridos' },
        { status: 400 }
      );
    }

    if (!/^\d{8,10}$/.test(body.cedula)) {
      return NextResponse.json(
        { error: 'Cédula debe tener 8-10 dígitos' },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        cedula: body.cedula,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null
      }
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Esta cédula ya está registrada' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}
```

## Single Resource Route Pattern
```typescript
// app/api/customers/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } } }
      }
    }
  });

  if (!customer) {
    return NextResponse.json(
      { error: 'Cliente no encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: customer });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Error al eliminar cliente' },
      { status: 500 }
    );
  }
}
```

## Order Status PATCH Pattern
```typescript
// app/api/orders/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  
  const existingOrder = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true }
  });

  if (!existingOrder) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // Stock deduction: only when payment changes TO pagado
  if (body.paymentStatus === 'pagado' && existingOrder.paymentStatus !== 'pagado') {
    for (const item of existingOrder.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      paymentStatus: body.paymentStatus ?? existingOrder.paymentStatus,
      shippingStatus: body.shippingStatus ?? existingOrder.shippingStatus
    }
  });

  return NextResponse.json({ success: true, data: order });
}
```

## Products Filtering Pattern
```typescript
// app/api/products/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const inStock = searchParams.get('inStock');

  const where: any = { isActive: true };
  
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (inStock === 'true') where.stock = { gt: 0 };

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ success: true, data: products });
}
```

## Error Response Standards
```typescript
// Validation error
return NextResponse.json({ error: 'Campo requerido' }, { status: 400 });

// Not found
return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

// Conflict (duplicate)
return NextResponse.json({ error: 'Ya existe' }, { status: 409 });

// Server error
return NextResponse.json({ error: 'Error interno' }, { status: 500 });
```