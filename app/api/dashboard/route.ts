import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Calculate today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    const [
      customersCount,
      productsCount,
      ordersCount,
      ordersToday,
      revenueTodayResult
    ] = await Promise.all([
      prisma.customer.count({ where: { active: true } }),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count(),
      prisma.order.count({
        where: {
          orderDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          orderDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        _sum: {
          total: true
        }
      })
    ])

    const revenueToday = revenueTodayResult._sum.total
      ? Number(revenueTodayResult._sum.total)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        customers: customersCount,
        products: productsCount,
        orders: ordersCount,
        ordersToday,
        revenueToday
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