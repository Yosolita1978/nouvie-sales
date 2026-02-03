/**
 * Fix Capilar Products Script
 *
 * Run with: npx tsx scripts/fix-capilar-products.ts
 *
 * This script:
 * 1. Updates category from "Productos" to "Capilar" for all capilar products
 * 2. Updates prices to correct values (sin IVA):
 *    - Shampoos (237 ml): $41,597
 *    - Mascarillas (177 ml): $52,101
 *    - Lociones (177 ml): $46,218
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Price mapping (sin IVA) based on product type
const CAPILAR_PRICES = {
  shampoo: 41597,    // $41,597 sin IVA → $49,500 con IVA
  mascarilla: 52101, // $52,101 sin IVA → $62,000 con IVA
  locion: 46218,     // $46,218 sin IVA → $55,000 con IVA
}

// Products to update with their correct prices
const CAPILAR_PRODUCTS = [
  { namePattern: 'Shampoo Suave y Liso', price: CAPILAR_PRICES.shampoo },
  { namePattern: 'Shampoo Revitalizante', price: CAPILAR_PRICES.shampoo },
  { namePattern: 'Shampoo Reparación', price: CAPILAR_PRICES.shampoo },
  { namePattern: 'Mascarilla Suave y Liso', price: CAPILAR_PRICES.mascarilla },
  { namePattern: 'Mascarilla Reparación', price: CAPILAR_PRICES.mascarilla },
  { namePattern: 'Loción Suave y Liso', price: CAPILAR_PRICES.locion },
  { namePattern: 'Loción Revitalizante', price: CAPILAR_PRICES.locion },
  { namePattern: 'Loción Reparación', price: CAPILAR_PRICES.locion },
]

async function main() {
  console.log('=' .repeat(60))
  console.log('FIX CAPILAR PRODUCTS')
  console.log('=' .repeat(60))
  console.log('')

  let updatedCount = 0
  let errors: string[] = []

  for (const product of CAPILAR_PRODUCTS) {
    try {
      // Find the product by name pattern
      const found = await prisma.product.findFirst({
        where: {
          name: {
            contains: product.namePattern,
            mode: 'insensitive'
          }
        }
      })

      if (!found) {
        console.log(`⚠️  NOT FOUND: ${product.namePattern}`)
        errors.push(`Not found: ${product.namePattern}`)
        continue
      }

      const oldPrice = Number(found.price)
      const oldCategory = found.category

      // Update the product
      await prisma.product.update({
        where: { id: found.id },
        data: {
          category: 'Capilar',
          price: product.price
        }
      })

      console.log(`✅ ${found.name}`)
      console.log(`   Category: ${oldCategory} → Capilar`)
      console.log(`   Price: $${oldPrice.toLocaleString('es-CO')} → $${product.price.toLocaleString('es-CO')}`)
      console.log(`   (con IVA: $${Math.round(product.price * 1.19).toLocaleString('es-CO')})`)
      console.log('')

      updatedCount++
    } catch (error) {
      const msg = `Error updating ${product.namePattern}: ${error}`
      console.log(`❌ ${msg}`)
      errors.push(msg)
    }
  }

  console.log('=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))
  console.log(`Updated: ${updatedCount} products`)

  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`)
    for (const err of errors) {
      console.log(`  - ${err}`)
    }
  }

  // Verify the updates
  console.log('')
  console.log('=' .repeat(60))
  console.log('VERIFICATION - Capilar Products After Update')
  console.log('=' .repeat(60))

  const capilarProducts = await prisma.product.findMany({
    where: { category: 'Capilar' },
    orderBy: { name: 'asc' }
  })

  if (capilarProducts.length === 0) {
    console.log('No products found in Capilar category!')
  } else {
    for (const p of capilarProducts) {
      const priceNum = Number(p.price)
      const priceWithIVA = Math.round(priceNum * 1.19)
      console.log(`✅ ${p.name}`)
      console.log(`   Price: $${priceNum.toLocaleString('es-CO')} (+IVA: $${priceWithIVA.toLocaleString('es-CO')})`)
    }
  }
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
