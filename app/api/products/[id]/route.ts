import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/products/[id]
 * 
 * Fetches a single product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    const serializedProduct = {
      ...product,
      price: Number(product.price),
      orderCount: product._count.orderItems
    }

    return NextResponse.json({
      success: true,
      data: serializedProduct
    })

  } catch (error) {
    console.error('Error fetching product:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar el producto',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/products/[id]
 * 
 * Deletes a product
 * Blocked if product is in any order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    if (product._count.orderItems > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No se puede eliminar: este producto está en ${product._count.orderItems} pedido${product._count.orderItems !== 1 ? 's' : ''}`
        },
        { status: 400 }
      )
    }

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error deleting product:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar el producto',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}