/**
 * List Product Catalog (read-only)
 *
 * Run with: npx tsx scripts/list-products.ts
 *
 * Dumps every Product so we can use it as the canonical list for
 * mapping the historic CSV's free-text order lines.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  console.log(`Total products: ${products.length}\n`)

  let currentCategory = ''
  for (const p of products) {
    if (p.category !== currentCategory) {
      currentCategory = p.category
      console.log(`\n=== ${currentCategory} ===`)
    }
    const flags = [p.active ? 'active' : 'INACTIVE', p.type].join(', ')
    console.log(
      `- ${p.name}  |  $${p.price.toString()}  |  stock ${p.stock}  |  ${flags}`
    )
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
