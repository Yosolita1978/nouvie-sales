import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface UpdateOrderBody {
  paymentStatus?: 'pending' | 'partial' | 'paid'
  shippingStatus?: 'preparing' | 'shipped' | 'delivered'
}

/**
 * GET /api/orders/[id]
 * 
 * Fetches a single order with customer and items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Convert Decimals to numbers
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

    return NextResponse.json({
      success: true,
      data: serializedOrder
    })

  } catch (error) {
    console.error('Error fetching order:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/orders/[id]
 * 
 * Updates order status (payment and/or shipping)
 * When paymentStatus changes to "paid", stock is deducted
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateOrderBody = await request.json()
    const { paymentStatus, shippingStatus } = body

    // Fetch current order
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    if (!currentOrder) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: {
      paymentStatus?: string
      paymentDate?: Date | null
      shippingStatus?: string
      shippingDate?: Date | null
      deliveryDate?: Date | null
    } = {}

    // Handle payment status change
    if (paymentStatus && paymentStatus !== currentOrder.paymentStatus) {
      updateData.paymentStatus = paymentStatus

      if (paymentStatus === 'paid') {
        updateData.paymentDate = new Date()
      } else if (paymentStatus === 'pending') {
        updateData.paymentDate = null
      }
    }

    // Handle shipping status change
    if (shippingStatus && shippingStatus !== currentOrder.shippingStatus) {
      updateData.shippingStatus = shippingStatus

      if (shippingStatus === 'shipped') {
        updateData.shippingDate = new Date()
      } else if (shippingStatus === 'delivered') {
        updateData.deliveryDate = new Date()
        if (!currentOrder.shippingDate) {
          updateData.shippingDate = new Date()
        }
      } else if (shippingStatus === 'preparing') {
        updateData.shippingDate = null
        updateData.deliveryDate = null
      }
    }

    // Check if we need to deduct stock (payment changing to "paid")
    const shouldDeductStock =
      paymentStatus === 'paid' && currentOrder.paymentStatus !== 'paid'

    // Check if we need to restore stock (payment changing FROM "paid" to something else)
    const shouldRestoreStock =
      paymentStatus &&
      paymentStatus !== 'paid' &&
      currentOrder.paymentStatus === 'paid'

    // Perform update in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Deduct stock if payment is now "paid"
      if (shouldDeductStock) {
        for (const item of currentOrder.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          })

          if (!product) {
            throw new Error(`Producto no encontrado: ${item.productId}`)
          }

          if (product.stock < item.quantity) {
            throw new Error(
              `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Requerido: ${item.quantity}`
            )
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { stock: product.stock - item.quantity }
          })
        }
      }

      // Restore stock if payment was "paid" and is being changed
      if (shouldRestoreStock) {
        for (const item of currentOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          })
        }
      }

      // Update the order
      const order = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })

      return order
    })

    // Convert Decimals to numbers
    const serializedOrder = {
      ...updatedOrder,
      subtotal: Number(updatedOrder.subtotal),
      tax: Number(updatedOrder.tax),
      total: Number(updatedOrder.total),
      items: updatedOrder.items.map(item => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          ...item.product,
          price: Number(item.product.price)
        }
      }))
    }

    let message = 'Pedido actualizado'
    if (shouldDeductStock) {
      message = 'Pedido marcado como pagado. Stock descontado.'
    } else if (shouldRestoreStock) {
      message = 'Estado de pago revertido. Stock restaurado.'
    }

    return NextResponse.json({
      success: true,
      data: serializedOrder,
      message
    })

  } catch (error) {
    console.error('Error updating order:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}