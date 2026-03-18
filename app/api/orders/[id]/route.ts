import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface OrderItemInput {
  productId: string
  quantity: number
  unitPrice: number
}

interface UpdateOrderBody {
  // Status updates (existing)
  paymentStatus?: 'pending' | 'partial' | 'paid'
  shippingStatus?: 'preparing' | 'shipped' | 'delivered'
  invoiceNumber?: string | null
  // Full order edit (new)
  customerId?: string
  items?: OrderItemInput[]
  paymentMethod?: string
  orderType?: string
  discount?: number
  notes?: string | null
}

const TAX_RATE = 0.19

/**
 * GET /api/orders/[id]
 *
 * Fetches a single order with customer and items
 */
export async function GET(
  _request: NextRequest,
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

    const serializedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
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
 * Updates an order. Supports two modes:
 * 1. Status updates: paymentStatus, shippingStatus, invoiceNumber
 * 2. Full edit: customerId, items, paymentMethod, orderType, discount, notes
 *
 * Stock handling:
 * - When paymentStatus changes to "paid": stock is deducted
 * - When paymentStatus changes FROM "paid": stock is restored
 * - When items change on a paid order: old stock restored, new stock deducted
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateOrderBody = await request.json()
    const { paymentStatus, shippingStatus, invoiceNumber, customerId, items, paymentMethod, orderType, discount, notes } = body

    // Fetch current order with items
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

    // Detect if this is a full order edit (items provided)
    const isFullEdit = items !== undefined

    // Validate customer if changing
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } })
      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        )
      }
    }

    // Build update data for order fields
    const updateData: Record<string, unknown> = {}

    // Handle invoice number change
    if (invoiceNumber !== undefined) {
      updateData.invoiceNumber = invoiceNumber || null
    }

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

    // Handle simple field updates
    if (customerId) updateData.customerId = customerId
    if (paymentMethod) updateData.paymentMethod = paymentMethod
    if (orderType) updateData.orderType = orderType
    if (notes !== undefined) updateData.notes = notes || null
    if (discount !== undefined) updateData.discount = discount

    // Recalculate totals if items or discount changed
    if (isFullEdit) {
      let subtotal = 0
      for (const item of items) {
        subtotal += item.unitPrice * item.quantity
      }
      const tax = Math.round(subtotal * TAX_RATE)
      const finalDiscount = discount !== undefined ? discount : Number(currentOrder.discount)
      const total = subtotal + tax - finalDiscount

      updateData.subtotal = subtotal
      updateData.tax = tax
      updateData.discount = finalDiscount
      updateData.total = total
    } else if (discount !== undefined) {
      // Only discount changed, recalculate total
      const subtotal = Number(currentOrder.subtotal)
      const tax = Number(currentOrder.tax)
      updateData.total = subtotal + tax - discount
    }

    // Stock logic flags
    const isPaid = currentOrder.paymentStatus === 'paid'
    const willBePaid = paymentStatus === 'paid' || (isPaid && paymentStatus === undefined)

    // For status-only changes (no items edit)
    const shouldDeductStock = !isFullEdit && paymentStatus === 'paid' && !isPaid
    const shouldRestoreStock = !isFullEdit && paymentStatus !== undefined && paymentStatus !== 'paid' && isPaid

    // Perform update in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // FULL EDIT: handle stock for items change
      if (isFullEdit) {
        // If order is paid, restore old stock first
        if (isPaid) {
          for (const item of currentOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            })
          }
        }

        // Validate new items exist and have stock (if order will be paid)
        if (willBePaid) {
          const productIds = items.map(i => i.productId)
          const products = await tx.product.findMany({ where: { id: { in: productIds } } })

          for (const item of items) {
            const product = products.find(p => p.id === item.productId)
            if (!product) {
              throw new Error(`Producto no encontrado: ${item.productId}`)
            }
            if (product.stock < item.quantity) {
              throw new Error(
                `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Requerido: ${item.quantity}`
              )
            }
          }

          // Deduct new stock
          for (const item of items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            })
          }
        }

        // Delete old items and create new ones
        await tx.orderItem.deleteMany({ where: { orderId: id } })
        for (const item of items) {
          await tx.orderItem.create({
            data: {
              orderId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity
            }
          })
        }
      }

      // STATUS-ONLY: stock deduction/restoration
      if (shouldDeductStock) {
        for (const item of currentOrder.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } })
          if (!product) throw new Error(`Producto no encontrado: ${item.productId}`)
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
          items: { include: { product: true } }
        }
      })

      return order
    })

    // Convert Decimals to numbers
    const serializedOrder = {
      ...updatedOrder,
      subtotal: Number(updatedOrder.subtotal),
      tax: Number(updatedOrder.tax),
      discount: Number(updatedOrder.discount),
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
    if (isFullEdit) {
      message = 'Pedido editado exitosamente'
    } else if (shouldDeductStock) {
      message = 'Pedido marcado como pagado. Stock descontado.'
    } else if (shouldRestoreStock) {
      message = 'Estado de pago revertido. Stock restaurado.'
    } else if (invoiceNumber !== undefined) {
      message = 'Número de factura actualizado'
    }

    return NextResponse.json({
      success: true,
      data: serializedOrder,
      message
    })

  } catch (error) {
    console.error('Error updating order:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este número de factura ya existe',
          message: 'El número de factura debe ser único'
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar el pedido',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/orders/[id]
 *
 * Deletes an order and its items
 * If payment was "paid", restores stock to products
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      if (order.paymentStatus === 'paid') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          })
        }
      }

      await tx.orderItem.deleteMany({ where: { orderId: id } })
      await tx.order.delete({ where: { id } })
    })

    return NextResponse.json({
      success: true,
      message: 'Pedido eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error deleting order:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el pedido',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
