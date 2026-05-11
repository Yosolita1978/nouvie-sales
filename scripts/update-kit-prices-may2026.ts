/**
 * Update Kit + Repuesto Prices — May 2026
 *
 * Run with: npx tsx scripts/update-kit-prices-may2026.ts
 *
 * Updates the 10 small-kit / repuesto prices for "Línea Hogar"
 * based on the client's updated price list (WhatsApp, 2026-05-09).
 *
 * Prices in DB are stored sin IVA — both nouvie-web (/productos, /catalogo for
 * repuestos) and nouvie-sales (orders) display the value multiplied by 1.19.
 * Note: the /catalogo page also uses static `bundlePrice` from product-data.ts
 * for KITS — those values already match the new prices, so no web changes needed.
 *
 * Safe to re-run: updates by exact name, does not create duplicates.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface PriceUpdate {
  name: string
  newPrice: number    // sin IVA (stored)
  newPriceIVA: number // con IVA (for log / verification)
}

const UPDATES: PriceUpdate[] = [
  // KITS (Línea Hogar)
  { name: 'Kit Lavavajilla',              newPrice: 14286, newPriceIVA: 17000 },
  { name: 'Kit Limpia Vidrios',           newPrice: 13445, newPriceIVA: 16000 },
  { name: 'Kit Desengrasante Multiusos',  newPrice: 15546, newPriceIVA: 18500 },
  { name: 'Kit Limpia Pisos',             newPrice: 14286, newPriceIVA: 17000 },
  { name: 'Kit Lustra Muebles',           newPrice: 14454, newPriceIVA: 17200 },

  // REPUESTOS (Línea Hogar)
  { name: 'Repuesto Lavavajilla',             newPrice: 10084, newPriceIVA: 12000 },
  { name: 'Repuesto Limpia Vidrios',          newPrice: 9664,  newPriceIVA: 11500 },
  { name: 'Repuesto Desengrasante Multiusos', newPrice: 11345, newPriceIVA: 13500 },
  { name: 'Repuesto Limpia Pisos',            newPrice: 10084, newPriceIVA: 12000 },
  { name: 'Repuesto Lustra Muebles',          newPrice: 10084, newPriceIVA: 12000 },
]

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE KIT + REPUESTO PRICES — May 2026')
  console.log('='.repeat(60))
  console.log('')

  let updated = 0
  let notFound = 0
  let unchanged = 0

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

    if (oldPrice === item.newPrice) {
      console.log(`✓  UNCHANGED: ${product.name} (already $${oldPrice.toLocaleString('es-CO')})`)
      unchanged++
      continue
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { price: item.newPrice },
    })

    console.log(`✅ ${product.name}`)
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
  console.log(`Updated:   ${updated}`)
  console.log(`Unchanged: ${unchanged}`)
  console.log(`Not found: ${notFound}`)
  console.log('')

  console.log('='.repeat(60))
  console.log('VERIFICATION — Kits + Repuestos in DB')
  console.log('='.repeat(60))

  const hogarItems = await prisma.product.findMany({
    where: {
      OR: [
        { name: { startsWith: 'Kit ', mode: 'insensitive' } },
        { name: { startsWith: 'Repuesto ', mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
  })

  for (const p of hogarItems) {
    const price = Number(p.price)
    const priceIVA = Math.round(price * 1.19)
    console.log(
      `${p.name.padEnd(40)} $${price.toLocaleString('es-CO').padStart(7)} sin IVA  →  $${priceIVA.toLocaleString('es-CO')} con IVA`
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
