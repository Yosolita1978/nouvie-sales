import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/products
 * 
 * Fetches products from the database
 * 
 * Query Parameters:
 *   - search: Optional. Filter by name
 *   - category: Optional. Filter by category
 * 
 * Examples:
 *   GET /api/products
 *   GET /api/products?search=shampoo
 *   GET /api/products?category=Envases
 *   GET /api/products?search=shampoo&category=Productos
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const category = searchParams.get('category')

    const whereConditions: Prisma.ProductWhereInput = {
      active: true
    }

    if (search) {
      whereConditions.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    if (category) {
      whereConditions.category = category
    }

    const products = await prisma.product.findMany({
      where: whereConditions,
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        unit: true,
        price: true,
        stock: true,
        minStock: true,
        active: true,
        createdAt: true
      }
    })

    // Convert Decimal to number for JSON serialization
    const serializedProducts = products.map(product => ({
      ...product,
      price: Number(product.price)
    }))

    return NextResponse.json({
      success: true,
      data: serializedProducts,
      count: serializedProducts.length
    })

  } catch (error) {
    console.error('Error fetching products:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}