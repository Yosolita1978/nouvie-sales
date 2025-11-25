import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Type for the POST request body
interface CreateCustomerBody {
  cedula: string
  name: string
  email: string
  phone: string
  address?: string
  city?: string
}

/**
 * GET /api/customers
 * 
 * Fetches customers from the database
 * 
 * Query Parameters:
 *   - search: Optional. Filter by name or cedula
 * 
 * Examples:
 *   GET /api/customers
 *   GET /api/customers?search=Maria
 *   GET /api/customers?search=1234567890
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    // Use Prisma's generated type for where conditions
    const whereConditions: Prisma.CustomerWhereInput = {
      active: true
    }

    if (search) {
      whereConditions.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          cedula: {
            contains: search
          }
        }
      ]
    }

    const customers = await prisma.customer.findMany({
      where: whereConditions,
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        cedula: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        active: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length
    })

  } catch (error) {
    console.error('Error fetching customers:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/customers
 * 
 * Creates a new customer in the database
 * 
 * Request Body:
 *   - cedula: string (required, unique, 8-10 digits)
 *   - name: string (required)
 *   - email: string (required, valid email)
 *   - phone: string (required)
 *   - address: string (optional)
 *   - city: string (optional)
 * 
 * Returns:
 *   - 201: Created customer object
 *   - 400: Validation error
 *   - 409: Duplicate cedula
 *   - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body with type assertion
    const body: CreateCustomerBody = await request.json()

    // Extract fields from body
    const { cedula, name, email, phone, address, city } = body

    // Validate required fields
    const errors: string[] = []

    if (!cedula || cedula.trim() === '') {
      errors.push('Cédula es requerida')
    } else if (!/^\d{8,10}$/.test(cedula.trim())) {
      errors.push('Cédula debe tener entre 8 y 10 dígitos')
    }

    if (!name || name.trim() === '') {
      errors.push('Nombre es requerido')
    }

    if (!email || email.trim() === '') {
      errors.push('Email es requerido')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push('Email no es válido')
    }

    if (!phone || phone.trim() === '') {
      errors.push('Teléfono es requerido')
    }

    // If there are validation errors, return them
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

    // Check if cedula already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { cedula: cedula.trim() }
    })

    if (existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate cedula',
          message: `Ya existe un cliente con la cédula ${cedula}`
        },
        { status: 409 }
      )
    }

    // Create the new customer using Prisma's typed input
    const customerData: Prisma.CustomerCreateInput = {
      cedula: cedula.trim(),
      name: name.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      active: true
    }

    const newCustomer = await prisma.customer.create({
      data: customerData
    })

    // Return the created customer
    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
        message: 'Cliente creado exitosamente'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error creating customer:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create customer',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}