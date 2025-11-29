import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [customersCount, productsCount, ordersCount] = await Promise.all([
      prisma.customer.count({ where: { active: true } }),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count()
    ])

    return NextResponse.json({
      success: true,
      data: {
        customers: customersCount,
        products: productsCount,
        orders: ordersCount
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}