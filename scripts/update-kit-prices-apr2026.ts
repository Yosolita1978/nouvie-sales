/**
 * Update Kit Prices — April 2026
 *
 * Run with: npx tsx scripts/update-kit-prices-apr2026.ts
 *
 * Updates two treatment kit prices based on new pricing from client (April 2026).
 * Prices in DB are stored sin IVA — the website adds 19% when displaying.
 *
 * Changes (con IVA → sin IVA):
 * - Tratamiento Reparación Intensa: $158,000 → $188,000 con IVA  (price: 132773 → 157983)
 * - Tratamiento Revitalizante:      $96,000  → $116,800 con IVA  (price: 80672  → 98151)
 *
 * Unchanged: Tratamiento Suave y Liso (already at $188,000 con IVA)
 *
 * Safe to re-run: updates by name, does not create duplicates.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PriceUpdate {
  name: string
  newPrice: number    // sin IVA
  newPriceIVA: number // con IVA (for display/log only)
}

const UPDATES: PriceUpdate[] = [
  {
    name: 'Tratamiento Reparación Intensa',
    newPrice: 157983,    // $188,000 / 1.19
    newPriceIVA: 188000,
  },
  {
    name: 'Tratamiento Revitalizante',
    newPrice: 98151,     // $116,800 / 1.19
    newPriceIVA: 116800,
  },
]

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE KIT PRICES — April 2026')
  console.log('='.repeat(60))
  console.log('')

  let updated = 0
  let notFound = 0

  for (const item of UPDATES) {
    const product = await prisma.product.findFirst({
      where: { name: { equals: item.name, mode: 'insensitive' } },
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: ${item.name}`)
      notFound++
      continue
    }

    const oldPrice = Number(product.price)
    const oldPriceIVA = Math.round(oldPrice * 1.19)

    await prisma.product.update({
      where: { id: product.id },
      data: { price: item.newPrice },
    })

    console.log(`✅ ${item.name}`)
    console.log(
      `   Sin IVA: $${oldPrice.toLocaleString('es-CO')} → $${item.newPrice.toLocaleString('es-CO')}`
    )
    console.log(
      `   Con IVA: $${oldPriceIVA.toLocaleString('es-CO')} → $${item.newPriceIVA.toLocaleString('es-CO')}`
    )
    console.log('')
    updated++
  }

  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Updated: ${updated}`)
  console.log(`Not found: ${notFound}`)
  console.log('')

  console.log('='.repeat(60))
  console.log('VERIFICATION — All Tratamiento kits')
  console.log('='.repeat(60))

  const treatments = await prisma.product.findMany({
    where: { name: { contains: 'Tratamiento', mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })

  for (const t of treatments) {
    const price = Number(t.price)
    const priceIVA = Math.round(price * 1.19)
    console.log(`${t.name}`)
    console.log(
      `   $${price.toLocaleString('es-CO')} sin IVA → $${priceIVA.toLocaleString('es-CO')} con IVA`
    )
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
