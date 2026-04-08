/**
 * Add Bioptimo Desengrasante 500ml to the catalog
 *
 * Run with: npx tsx scripts/add-bioptimo.ts
 *
 * Context:
 *   - Client confirmed price: $13,900 COP IVA included
 *   - DB stores prices SIN IVA (web/sales apply 19% at display time)
 *   - Stored value: 13900 / 1.19 ≈ 11681
 *
 * The product name "Desengrasante Bioptimo 500ml" slugifies to
 * "desengrasante-bioptimo-500ml", which matches the hardcoded
 * frontend card in nouvie-web/lib/product-data.ts so the price
 * will appear automatically on the public website.
 *
 * Idempotent: re-running updates price and stock instead of duplicating.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BIOPTIMO = {
  name: 'Desengrasante Bioptimo 500ml',
  type: 'simple',
  category: 'Hogar',
  unit: 'und',
  price: 11681, // sin IVA — displays as $13,900 con IVA
  stock: 10,
  minStock: 5,
  active: true,
} as const

async function main() {
  console.log('='.repeat(60))
  console.log('ADD BIOPTIMO — Desengrasante 500ml')
  console.log('='.repeat(60))
  console.log('')

  const existing = await prisma.product.findFirst({
    where: { name: { equals: BIOPTIMO.name, mode: 'insensitive' } },
  })

  if (existing) {
    const oldPrice = Number(existing.price)
    const oldStock = existing.stock

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        price: BIOPTIMO.price,
        stock: BIOPTIMO.stock,
        active: true,
      },
    })

    console.log(`⏭️  ALREADY EXISTS — updated price and stock`)
    console.log(`   Name:  ${BIOPTIMO.name}`)
    console.log(`   Price: $${oldPrice.toLocaleString('es-CO')} → $${BIOPTIMO.price.toLocaleString('es-CO')} (sin IVA)`)
    console.log(`   Stock: ${oldStock} → ${BIOPTIMO.stock}`)
  } else {
    await prisma.product.create({
      data: {
        name: BIOPTIMO.name,
        type: BIOPTIMO.type,
        category: BIOPTIMO.category,
        unit: BIOPTIMO.unit,
        price: BIOPTIMO.price,
        stock: BIOPTIMO.stock,
        minStock: BIOPTIMO.minStock,
        active: BIOPTIMO.active,
      },
    })

    console.log(`🆕 CREATED: ${BIOPTIMO.name}`)
  }
  console.log('')

  // --- VERIFICATION ---
  console.log('='.repeat(60))
  console.log('VERIFICATION')
  console.log('='.repeat(60))

  const final = await prisma.product.findFirst({
    where: { name: { equals: BIOPTIMO.name, mode: 'insensitive' } },
  })

  if (!final) {
    console.log('❌ ERROR: product not found after upsert')
    return
  }

  const priceSinIVA = Number(final.price)
  const priceConIVA = Math.round(priceSinIVA * 1.19)
  const status = final.active ? '🟢' : '🔴'

  console.log(`${status} ${final.name}`)
  console.log(`   Category: ${final.category}`)
  console.log(`   Unit:     ${final.unit}`)
  console.log(`   Stock:    ${final.stock}`)
  console.log(`   Price:    $${priceSinIVA.toLocaleString('es-CO')} sin IVA`)
  console.log(`             $${priceConIVA.toLocaleString('es-CO')} con IVA  ← what the client sees`)
  console.log('')
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
