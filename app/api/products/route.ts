import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

interface CreateProductBody {
  name: string
  category: string
  unit: string
  price: number
  stock?: number
  minStock?: number
}

/**
 * GET /api/products
 * 
 * Fetches products from the database
 * 
 * Query Parameters:
 *   - search: Optional. Filter by name
 *   - category: Optional. Filter by category
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

/**
 * POST /api/products
 * 
 * Creates a new product in the database
 * 
 * Request Body:
 *   - name: string (required)
 *   - category: string (required)
 *   - unit: string (required)
 *   - price: number (required, in COP)
 *   - stock: number (optional, default 0)
 *   - minStock: number (optional, default 5)
 * 
 * Returns:
 *   - 201: Created product object
 *   - 400: Validation error
 *   - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateProductBody = await request.json()
    const { name, category, unit, price, stock, minStock } = body

    const errors: string[] = []

    if (!name || name.trim() === '') {
      errors.push('Nombre es requerido')
    }

    if (!category || category.trim() === '') {
      errors.push('Categoría es requerida')
    }

    if (!unit || unit.trim() === '') {
      errors.push('Unidad es requerida')
    }

    if (price === undefined || price === null) {
      errors.push('Precio es requerido')
    } else if (typeof price !== 'number' || price < 0) {
      errors.push('Precio debe ser un número positivo')
    }

    if (stock !== undefined && (typeof stock !== 'number' || stock < 0)) {
      errors.push('Stock debe ser un número positivo')
    }

    if (minStock !== undefined && (typeof minStock !== 'number' || minStock < 0)) {
      errors.push('Stock mínimo debe ser un número positivo')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: errors
        },
        { status: 400 }
      )
    }

    const productData: Prisma.ProductCreateInput = {
      name: name.trim(),
      type: 'simple',
      category: category.trim(),
      unit: unit.trim(),
      price: price,
      stock: stock ?? 0,
      minStock: minStock ?? 5,
      active: true
    }

    const newProduct = await prisma.product.create({
      data: productData
    })

    const serializedProduct = {
      ...newProduct,
      price: Number(newProduct.price)
    }

    return NextResponse.json(
      {
        success: true,
        data: serializedProduct,
        message: 'Producto creado exitosamente'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating product:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}