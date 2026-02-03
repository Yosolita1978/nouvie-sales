/**
 * Database Audit Script — Product Catalog
 *
 * Run with: npx tsx scripts/audit-products.ts
 *
 * This script queries the current Product table and displays:
 * - All products grouped by category
 * - Prices (sin IVA stored in DB)
 * - Stock levels
 * - Active status
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=' .repeat(60))
  console.log('NOUVIE PRODUCT CATALOG AUDIT')
  console.log('=' .repeat(60))
  console.log('')

  // Get all products ordered by category and name
  const products = await prisma.product.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  })

  console.log(`Total products in database: ${products.length}`)
  console.log('')

  // Group by category
  const byCategory = products.reduce((acc, p) => {
    const cat = p.category || 'Sin Categoría'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {} as Record<string, typeof products>)

  // Display each category
  for (const [category, categoryProducts] of Object.entries(byCategory)) {
    console.log('-'.repeat(60))
    console.log(`CATEGORY: ${category} (${categoryProducts.length} products)`)
    console.log('-'.repeat(60))

    for (const p of categoryProducts) {
      const priceNum = Number(p.price)
      const priceWithIVA = Math.round(priceNum * 1.19)
      const status = p.active ? '✅' : '❌'

      console.log(`${status} ${p.name}`)
      console.log(`   ID: ${p.id}`)
      console.log(`   Price (sin IVA): $${priceNum.toLocaleString('es-CO')}`)
      console.log(`   Price (+IVA): $${priceWithIVA.toLocaleString('es-CO')}`)
      console.log(`   Stock: ${p.stock} | Min: ${p.minStock} | Unit: ${p.unit}`)
      console.log('')
    }
  }

  // Summary statistics
  console.log('=' .repeat(60))
  console.log('SUMMARY BY CATEGORY')
  console.log('=' .repeat(60))

  for (const [category, categoryProducts] of Object.entries(byCategory)) {
    const activeCount = categoryProducts.filter(p => p.active).length
    const inactiveCount = categoryProducts.length - activeCount
    console.log(`${category}: ${categoryProducts.length} total (${activeCount} active, ${inactiveCount} inactive)`)
  }

  // Look for capilar products specifically (to see what needs renaming)
  console.log('')
  console.log('=' .repeat(60))
  console.log('CAPILAR PRODUCTS (for renaming check)')
  console.log('=' .repeat(60))

  const capilarKeywords = ['shampoo', 'mascarilla', 'loción', 'locion', 'honey', 'kiwi', 'mountain', 'açaí', 'acai', 'melon']
  const potentialCapilar = products.filter(p =>
    capilarKeywords.some(kw => p.name.toLowerCase().includes(kw))
  )

  if (potentialCapilar.length > 0) {
    for (const p of potentialCapilar) {
      console.log(`- ${p.name} (${p.category}) - $${Number(p.price).toLocaleString('es-CO')}`)
    }
  } else {
    console.log('No capilar products found with keywords: shampoo, mascarilla, loción, honey, kiwi, mountain')
  }

  // Look for hogar products
  console.log('')
  console.log('=' .repeat(60))
  console.log('HOGAR PRODUCTS (unchanged products check)')
  console.log('=' .repeat(60))

  const hogarKeywords = ['detergente', 'desengrasante', 'limpia vidrios', 'limpia pisos', 'lustra muebles']
  const potentialHogar = products.filter(p =>
    hogarKeywords.some(kw => p.name.toLowerCase().includes(kw))
  )

  if (potentialHogar.length > 0) {
    for (const p of potentialHogar) {
      console.log(`- ${p.name} (${p.category}) - $${Number(p.price).toLocaleString('es-CO')}`)
    }
  } else {
    console.log('No hogar products found')
  }

  console.log('')
  console.log('Audit complete!')
}

main()
  .catch((e) => {
    console.error('Audit failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
