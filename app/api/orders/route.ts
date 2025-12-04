import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const TAX_RATE = 0.19 // 19% IVA

// Type for items in the order creation request
interface OrderItemInput {
  productId: string
  quantity: number
  unitPrice: number
}

// Type for the full request body
interface CreateOrderBody {
  customerId: string
  items: OrderItemInput[]
  paymentMethod: 'cash' | 'nequi' | 'bank' | 'link'
  notes?: string
}

/**
 * GET /api/orders
 * 
 * Fetches orders with optional filtering
 * 
 * Query Parameters:
 *   - search: Filter by order number or customer name
 *   - paymentStatus: Filter by payment status (pending, partial, paid)
 *   - shippingStatus: Filter by shipping status (preparing, shipped, delivered)
 *   - period: Filter by time period (week = last 7 days)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const paymentStatus = searchParams.get('paymentStatus')
    const shippingStatus = searchParams.get('shippingStatus')
    const period = searchParams.get('period')

    // Build where clause dynamically
    const whereConditions: Prisma.OrderWhereInput = {}

    // Filter by payment status
    if (paymentStatus) {
      whereConditions.paymentStatus = paymentStatus
    }

    // Filter by shipping status
    if (shippingStatus) {
      whereConditions.shippingStatus = shippingStatus
    }

    // Filter by period (this week = last 7 days)
    if (period === 'week') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      whereConditions.orderDate = {
        gte: sevenDaysAgo
      }
    }

    // Filter by search (order number or customer name)
    if (search) {
      whereConditions.OR = [
        {
          orderNumber: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ]
    }

    const orders = await prisma.order.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Convert Decimals to numbers
    const serializedOrders = orders.map(order => ({
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      items: order.items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    }))

    return NextResponse.json({
      success: true,
      data: serializedOrders,
      count: serializedOrders.length
    })

  } catch (error) {
    console.error('Error fetching orders:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/orders
 * 
 * Creates a new order with items
 * 
 * Request Body:
 *   - customerId: string (required)
 *   - items: array of { productId, quantity, unitPrice }
 *   - paymentMethod: 'cash' | 'nequi' | 'bank' | 'link'
 *   - notes: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json()
    const { customerId, items, paymentMethod, notes } = body

    // Validate required fields
    const errors: string[] = []

    if (!customerId) {
      errors.push('Cliente es requerido')
    }

    if (!items || items.length === 0) {
      errors.push('Debe agregar al menos un producto')
    }

    if (!paymentMethod) {
      errors.push('Método de pago es requerido')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors },
        { status: 400 }
      )
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Validate products and check stock
    const productIds = items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: 'Uno o más productos no encontrados' },
        { status: 404 }
      )
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (product && product.stock < item.quantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` 
          },
          { status: 400 }
        )
      }
    }

    // Generate order number
    const year = new Date().getFullYear()
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: { startsWith: `ORD-${year}-` }
      },
      orderBy: { orderNumber: 'desc' }
    })

    let sequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2], 10)
      sequence = lastSequence + 1
    }
    const orderNumber = `ORD-${year}-${sequence.toString().padStart(4, '0')}`

    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      subtotal += item.unitPrice * item.quantity
    }
    const tax = Math.round(subtotal * TAX_RATE)
    const total = subtotal + tax

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          subtotal,
          tax,
          total,
          paymentMethod,
          paymentStatus: 'pending',
          shippingStatus: 'preparing',
          notes: notes || null,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity
            }))
          }
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })

      return newOrder
    })

    // Convert Decimals to numbers for JSON
    const serializedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      items: order.items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    }

    return NextResponse.json(
      {
        success: true,
        data: serializedOrder,
        message: `Pedido ${orderNumber} creado exitosamente`
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating order:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}