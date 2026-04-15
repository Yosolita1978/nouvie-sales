import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/orders/months
 *
 * Returns distinct months that have orders, with order count per month.
 * Used to populate the "Ver pedidos por mes" navigation.
 */
export async function GET() {
  try {
    const results = await prisma.$queryRaw<
      { year: number; month: number; count: bigint }[]
    >`
      SELECT
        EXTRACT(YEAR FROM "orderDate")::int AS year,
        EXTRACT(MONTH FROM "orderDate")::int AS month,
        COUNT(*)::bigint AS count
      FROM "orders"
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `

    const months = results.map((row) => ({
      year: row.year,
      month: row.month,
      key: `${row.year}-${String(row.month).padStart(2, '0')}`,
      count: Number(row.count)
    }))

    return NextResponse.json({ success: true, data: months })
  } catch (error) {
    console.error('Error fetching order months:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order months',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
