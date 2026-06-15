import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { customerCreateSchema, zodErrorMessages } from '@/lib/validation/customer'

/**
 * GET /api/customers
 *
 * Fetches customers from the database, including each customer's most
 * recent order and total order count (used on the customer cards).
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
        documentType: true,
        cedula: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Most recent order for this customer (for the card summary)
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            total: true,
            paymentStatus: true,
            createdAt: true
          }
        },
        // Total number of orders this customer has
        _count: {
          select: { orders: true }
        }
      }
    })

    // Flatten each customer's latest order into a single `lastOrder` field
    // and convert Decimal totals to plain numbers for JSON.
    const serializedCustomers = customers.map((customer) => {
      const { orders, _count, ...rest } = customer
      const latest = orders[0]

      return {
        ...rest,
        orderCount: _count.orders,
        lastOrder: latest
          ? {
              total: Number(latest.total),
              paymentStatus: latest.paymentStatus,
              createdAt: latest.createdAt
            }
          : null
      }
    })

    return NextResponse.json({
      success: true,
      data: serializedCustomers,
      count: serializedCustomers.length
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
 * Creates a new customer.
 *
 * Required: name, phone.
 * Optional: cedula, email (empty values are stored as NULL, never "").
 *
 * Returns:
 *   - 201: Created customer object
 *   - 400: Validation error
 *   - 409: Duplicate cedula
 *   - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Validate + normalize with the shared zod schema. Empty cedula/email
    // come back as null, so they are persisted as NULL (not "").
    const parsed = customerCreateSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: zodErrorMessages(parsed.error)
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Build Prisma input. null is passed through for cedula/email — never "".
    const customerData: Prisma.CustomerCreateInput = {
      documentType: data.documentType ?? 'cedula',
      cedula: data.cedula,
      name: data.name.toUpperCase(),
      email: data.email ? data.email.toLowerCase() : null,
      phone: data.phone,
      address: data.address,
      city: data.city,
      active: true
    }

    // No check-then-insert: let the unique constraint decide and catch P2002.
    const newCustomer = await prisma.customer.create({
      data: customerData
    })

    return NextResponse.json(
      {
        success: true,
        data: newCustomer,
        message: 'Cliente creado exitosamente'
      },
      { status: 201 }
    )

  } catch (error) {
    // Duplicate cédula → unique constraint violation (P2002).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate cedula',
          message: 'Ya existe un cliente con esta cédula.'
        },
        { status: 409 }
      )
    }

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
