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
 * PATCH /api/customers/[id]
 *
 * Updates a customer's information
 * Cedula cannot be changed (it's the unique identifier)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

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

    // Validate required fields
    const errors: string[] = []

    if (body.name !== undefined && !body.name.trim()) {
      errors.push('Nombre es requerido')
    }

    if (body.email !== undefined && body.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email.trim())) {
        errors.push('Email no es válido')
      }
    }

    if (body.phone !== undefined && !body.phone.trim()) {
      errors.push('Teléfono es requerido')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      )
    }

    // Build update data (only include fields that were provided)
    const updateData: {
      name?: string
      email?: string | null
      phone?: string
      address?: string | null
      city?: string | null
    } = {}

    if (body.name !== undefined) {
      updateData.name = body.name.trim().toUpperCase()
    }
    if (body.email !== undefined) {
      updateData.email = body.email.trim().toLowerCase() || null
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone.trim()
    }
    if (body.address !== undefined) {
      updateData.address = body.address.trim() || null
    }
    if (body.city !== undefined) {
      updateData.city = body.city.trim() || null
    }

    // Update customer
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