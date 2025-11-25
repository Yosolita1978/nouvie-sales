import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
 * 
 * Returns:
 *   - 200: Array of customers
 *   - 500: Error message
 */
export async function GET(request: NextRequest) {
  try {
    // Extract search query parameter from URL
    // Example: /api/customers?search=Maria
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    // Build the database query
    // Start with base conditions: only active customers
    const whereConditions: Prisma.CustomerWhereInput = {
      active: true
    }

    // If search parameter exists, add search conditions
    if (search) {
      // Search in both name (case-insensitive) AND cedula
      // This allows searching by name OR ID number
      whereConditions.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive' // Case-insensitive search
          }
        },
        {
          cedula: {
            contains: search
          }
        }
      ]
    }

    // Execute the database query
    const customers = await prisma.customer.findMany({
      where: whereConditions,
      orderBy: {
        name: 'asc' // Sort alphabetically by name
      },
      select: {
        // Only select the fields we need (more efficient)
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

    // Return successful response with customer data
    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length
    })

  } catch (error) {
    // Log error for debugging (will appear in terminal)
    console.error('Error fetching customers:', error)

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 } // 500 = Internal Server Error
    )
  }
}