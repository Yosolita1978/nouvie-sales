/**
 * Fix Institucional Product Prices
 *
 * Run with: npx tsx scripts/fix-institucional-prices.ts
 *
 * Updates prices based on client's official price list (lista precios institucional.jpeg)
 * All prices are sin IVA (before tax)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Correct prices from client's price list (sin IVA)
const INSTITUCIONAL_PRICES = [
  // LIMPIA VIDRIOS
  { namePattern: 'Limpia Vidrios Institucional Concentrado (1 l)', price: 43950 },
  { namePattern: 'Limpia Vidrios Institucional Concentrado (250 ml)', price: 12941 },

  // DESENGRASANTE MULTIUSOS
  { namePattern: 'Desengrasante Institucional Concentrado (1 gal)', price: 234874 },
  { namePattern: 'Desengrasante Institucional Concentrado (1 l)', price: 79832 },

  // LIMPIA PISOS
  { namePattern: 'Limpia Pisos Institucional Concentrado (1 gal)', price: 47059 },
  { namePattern: 'Limpia Pisos Institucional Concentrado (2 l)', price: 29748 },
  { namePattern: 'Limpia Pisos Institucional Concentrado (1 l)', price: 19832 },

  // LIMPIADOR DE SUPERFICIES
  { namePattern: 'Limpiador de Superficies Listo Para Usar (1 gal)', price: 120168 },
  { namePattern: 'Limpiador de Superficies Listo Para Usar (500 ml)', price: 22605 },

  // DETERGENTE MÁQUINA LAVAVAJILLAS
  { namePattern: 'Detergente Máquina Lavavajillas Listo Para Usar (1 gal)', price: 96555 },
  { namePattern: 'Detergente Máquina Lavavajillas Listo Para Usar (2 l)', price: 62941 },
  { namePattern: 'Detergente Máquina Lavavajillas Listo Para Usar (1 l)', price: 41597 },
]

async function main() {
  console.log('=' .repeat(60))
  console.log('FIX INSTITUCIONAL PRICES')
  console.log('=' .repeat(60))
  console.log('')

  let updated = 0
  let notFound = 0

  for (const item of INSTITUCIONAL_PRICES) {
    const product = await prisma.product.findFirst({
      where: {
        name: {
          equals: item.namePattern,
          mode: 'insensitive'
        }
      }
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: ${item.namePattern}`)
      notFound++
      continue
    }

    const oldPrice = Number(product.price)
    const newPrice = item.price
    const oldPriceIVA = Math.round(oldPrice * 1.19)
    const newPriceIVA = Math.round(newPrice * 1.19)

    await prisma.product.update({
      where: { id: product.id },
      data: { price: newPrice }
    })

    console.log(`✅ ${product.name}`)
    console.log(`   Old: $${oldPrice.toLocaleString('es-CO')} (+IVA: $${oldPriceIVA.toLocaleString('es-CO')})`)
    console.log(`   New: $${newPrice.toLocaleString('es-CO')} (+IVA: $${newPriceIVA.toLocaleString('es-CO')})`)
    console.log('')

    updated++
  }

  console.log('=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))
  console.log(`Updated: ${updated} products`)
  console.log(`Not found: ${notFound} products`)

  // Verify
  console.log('')
  console.log('=' .repeat(60))
  console.log('VERIFICATION - Institucional Products')
  console.log('=' .repeat(60))

  const institucional = await prisma.product.findMany({
    where: { category: 'Institucional' },
    orderBy: { name: 'asc' }
  })

  for (const p of institucional) {
    const price = Number(p.price)
    const priceIVA = Math.round(price * 1.19)
    console.log(`${p.name}`)
    console.log(`   $${price.toLocaleString('es-CO')} (+IVA: $${priceIVA.toLocaleString('es-CO')})`)
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
