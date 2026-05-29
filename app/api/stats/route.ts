import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/stats?month=YYYY-MM
 *
 * Analytics for the admin "Estadísticas" view:
 *   - topProducts:  most-ordered products in the selected month
 *   - topCustomers: customers who spent the most in the selected month
 *   - salesByMonth: revenue + order count for the last 12 months (trend)
 *
 * The `month` filter applies to topProducts and topCustomers.
 * salesByMonth is always multi-month (a trend) and ignores the filter.
 * Defaults to the current month when `month` is missing or invalid.
 */
export async function GET(request: NextRequest) {
  try {
    const monthParam = request.nextUrl.searchParams.get('month')

    // Resolve the selected month into a [start, end] date range.
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() // 0-indexed

    if (monthParam) {
      const [yearStr, monthStr] = monthParam.split('-')
      const parsedYear = parseInt(yearStr, 10)
      const parsedMonth = parseInt(monthStr, 10) // 1-indexed in the param
      if (!Number.isNaN(parsedYear) && parsedMonth >= 1 && parsedMonth <= 12) {
        year = parsedYear
        month = parsedMonth - 1
      }
    }

    const startOfMonth = new Date(year, month, 1, 0, 0, 0)
    // Day 0 of the next month = last day of this month
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

    // Run all aggregations in parallel
    const [topProductsRaw, topCustomersRaw, salesByMonthRaw] = await Promise.all([
      // Most-ordered products in the selected month
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            orderDate: { gte: startOfMonth, lte: endOfMonth }
          }
        },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10
      }),

      // Top customers by total spent in the selected month
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          orderDate: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 10
      }),

      // Revenue + order count for the last 12 months (trend)
      prisma.$queryRaw<
        { year: number; month: number; count: bigint; revenue: number | null }[]
      >`
        SELECT
          EXTRACT(YEAR FROM "orderDate")::int AS year,
          EXTRACT(MONTH FROM "orderDate")::int AS month,
          COUNT(*)::bigint AS count,
          SUM("total")::float AS revenue
        FROM "orders"
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 12
      `
    ])

    // Attach product names (single query, no N+1)
    const productIds = topProductsRaw.map((row) => row.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, unit: true }
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const topProducts = topProductsRaw.map((row) => {
      const product = productMap.get(row.productId)
      return {
        productId: row.productId,
        name: product?.name ?? 'Producto eliminado',
        unit: product?.unit ?? '',
        quantity: row._sum.quantity ?? 0,
        revenue: row._sum.subtotal ? Number(row._sum.subtotal) : 0
      }
    })

    // Attach customer names (single query, no N+1)
    const customerIds = topCustomersRaw.map((row) => row.customerId)
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true }
    })
    const customerMap = new Map(customers.map((c) => [c.id, c]))

    const topCustomers = topCustomersRaw.map((row) => ({
      customerId: row.customerId,
      name: customerMap.get(row.customerId)?.name ?? 'Cliente eliminado',
      total: row._sum.total ? Number(row._sum.total) : 0,
      orderCount: row._count
    }))

    // Shape the monthly trend oldest-first for charting
    const salesByMonth = salesByMonthRaw
      .map((row) => ({
        key: `${row.year}-${String(row.month).padStart(2, '0')}`,
        year: row.year,
        month: row.month,
        count: Number(row.count),
        revenue: row.revenue ? Number(row.revenue) : 0
      }))
      .reverse() // oldest -> newest

    return NextResponse.json({
      success: true,
      data: {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        topProducts,
        topCustomers,
        salesByMonth
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
