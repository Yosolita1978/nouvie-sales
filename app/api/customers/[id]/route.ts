import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/customers/[id]
 * 
 * Fetches a single customer by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            total: true,
            paymentStatus: true,
            shippingStatus: true,
            createdAt: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    const serializedCustomer = {
      ...customer,
      orders: customer.orders.map(order => ({
        ...order,
        total: Number(order.total)
      }))
    }

    return NextResponse.json({
      success: true,
      data: serializedCustomer
    })

  } catch (error) {
    console.error('Error fetching customer:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar el cliente',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/customers/[id]
 * 
 * Deletes a customer
 * Blocked if customer has any orders
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    if (customer._count.orders > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar: este cliente tiene ${customer._count.orders} pedido${customer._count.orders !== 1 ? 's' : ''}`
        },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error deleting customer:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el cliente',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}