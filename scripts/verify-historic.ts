/**
 * Verify the historic import landed (read-only).
 * Run with: npx tsx scripts/verify-historic.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.historicSale.count()
  const items = await prisma.historicSaleItem.count()
  console.log(`historic_sales: ${sales}   historic_sale_items: ${items}\n`)

  const byYear = await prisma.historicSale.groupBy({
    by: ['year'],
    _count: { _all: true },
    _sum: { amount: true },
    orderBy: { year: 'asc' },
  })
  console.log('Per year:')
  for (const y of byYear) {
    console.log(`  ${y.year}: ${y._count._all} sales, total $${Number(y._sum.amount).toLocaleString('es-CO')}`)
  }

  const topProducts = await prisma.historicSaleItem.groupBy({
    by: ['productName'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 12,
  })
  console.log('\nTop products (all years, by quantity):')
  for (const p of topProducts) {
    console.log(`  ${String(p._sum.quantity).padStart(4)}  ${p.productName}`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
