import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { customerUpdateSchema, zodErrorMessages } from '@/lib/validation/customer'

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
 * PATCH /api/customers/[id]
 *
 * Updates a customer. Only the fields present in the request body are changed.
 * Empty cedula/email are stored as NULL (never ""). Clearing the cédula is
 * blocked when the customer already has facturas, to preserve the
 * "no cédula, no factura" invariant after the fact.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate + normalize with the shared zod schema. undefined = field not
    // sent (leave as-is); null = explicitly clear an optional field.
    const parsed = customerUpdateSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: zodErrorMessages(parsed.error) },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Point 4: do not allow removing the cédula from a customer who already
    // has facturas emitted — that would orphan a factura on a cédula-less
    // customer and break the invariant.
    if (data.cedula === null && existingCustomer.cedula) {
      const facturaCount = await prisma.order.count({
        where: { customerId: id, invoiceNumber: { not: null } }
      })
      if (facturaCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No se puede quitar la cédula: el cliente ya tiene facturas emitidas.'
          },
          { status: 400 }
        )
      }
    }

    // Build update data — only include fields that were actually sent.
    // null is passed through for cedula/email (clears them); never "".
    const updateData: Prisma.CustomerUpdateInput = {}

    if (data.documentType !== undefined) updateData.documentType = data.documentType
    if (data.cedula !== undefined) updateData.cedula = data.cedula
    if (data.name !== undefined) updateData.name = data.name.toUpperCase()
    if (data.email !== undefined) updateData.email = data.email ? data.email.toLowerCase() : null
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address
    if (data.city !== undefined) updateData.city = data.city

    // No check-then-update for the cédula: let the unique constraint decide
    // and catch P2002.
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: 'Cliente actualizado exitosamente'
    })

  } catch (error) {
    // Duplicate cédula → unique constraint violation (P2002).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe un cliente con esta cédula.'
        },
        { status: 409 }
      )
    }

    console.error('Error updating customer:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar el cliente',
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
