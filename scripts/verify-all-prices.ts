/**
 * Verify and Fix All Product Prices
 *
 * Run with: npx tsx scripts/verify-all-prices.ts
 *
 * Based on client's final price list (February 2026)
 * All prices are sin IVA (before tax)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Client's official price list (sin IVA)
const CORRECT_PRICES = [
  // HOGAR 250ml Concentrados
  { name: 'Detergente Neutro Concentrado (250 ml)', price: 46387, category: 'Hogar' },
  { name: 'Desengrasante Multiusos Concentrado (250 ml)', price: 46387, category: 'Hogar' },
  { name: 'Limpia Vidrios Concentrado (250 ml)', price: 43487, category: 'Hogar' },
  { name: 'Lustra Muebles Concentrado (250 ml)', price: 43487, category: 'Hogar' },
  { name: 'Limpia Pisos Concentrado (250 ml)', price: 43487, category: 'Hogar' },

  // INSTITUCIONAL
  { name: 'Limpia Vidrios Institucional Concentrado (1 l)', price: 50543, category: 'Institucional' },
  { name: 'Limpia Vidrios Institucional Concentrado (250 ml)', price: 14882, category: 'Institucional' },
  { name: 'Desengrasante Institucional Concentrado (1 gal)', price: 270105, category: 'Institucional' },
  { name: 'Desengrasante Institucional Concentrado (1 l)', price: 91807, category: 'Institucional' },
  { name: 'Limpia Pisos Institucional Concentrado (1 gal)', price: 54118, category: 'Institucional' },
  { name: 'Limpia Pisos Institucional Concentrado (2 l)', price: 34210, category: 'Institucional' },
  { name: 'Limpia Pisos Institucional Concentrado (1 l)', price: 22807, category: 'Institucional' },
  { name: 'Limpiador de Superficies Listo Para Usar (1 gal)', price: 138193, category: 'Institucional' },
  { name: 'Limpiador de Superficies Listo Para Usar (500 ml)', price: 25996, category: 'Institucional' },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (1 gal)', price: 111038, category: 'Institucional' },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (2 l)', price: 72382, category: 'Institucional' },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (1 l)', price: 47837, category: 'Institucional' },

  // ORDEÑO
  { name: 'Detergente Alcalino (1 l)', price: 116159, category: 'Ordeño' },
  { name: 'Desincrustante (1 l)', price: 116159, category: 'Ordeño' },
  { name: 'Sanitizante (1 l)', price: 62815, category: 'Ordeño' },

  // CAPILAR — Updated April 2026 (Mercado Libre price alignment)
  { name: 'Shampoo Suave y Liso (237 ml)', price: 57143, category: 'Capilar' },
  { name: 'Shampoo Revitalizante (237 ml)', price: 57143, category: 'Capilar' },
  { name: 'Shampoo Reparación intensa (237 ml)', price: 57143, category: 'Capilar' },
  { name: 'Mascarilla Suave y Liso (177 ml)', price: 73950, category: 'Capilar' },
  { name: 'Mascarilla Reparación intensa (177 ml)', price: 73950, category: 'Capilar' },
  { name: 'Loción Suave y Liso (177 ml)', price: 65546, category: 'Capilar' },
  { name: 'Loción Revitalizante (177 ml)', price: 65546, category: 'Capilar' },
  { name: 'Loción Reparación intensa (177 ml)', price: 65546, category: 'Capilar' },

  // ATOMIZADORES
  { name: 'Atomizador Desengrasante Multiusos (500 ml)', price: 4832, category: 'Hogar' },
  { name: 'Atomizador Detergente Neutro (500 ml)', price: 4832, category: 'Hogar' },
  { name: 'Atomizador Lustra Muebles (500 ml)', price: 4832, category: 'Hogar' },

  // KITS
  { name: 'Kit Lavavajilla', price: 12805, category: 'Hogar' },
  { name: 'Kit Limpia Vidrios', price: 12100, category: 'Hogar' },
  { name: 'Kit Desengrasante Multiusos', price: 13336, category: 'Hogar' },
  { name: 'Kit Limpia Pisos', price: 11887, category: 'Hogar' },
  { name: 'Kit Lustra Muebles', price: 13336, category: 'Hogar' },

  // REPUESTOS
  { name: 'Repuesto Lavavajilla', price: 9664, category: 'Hogar' },
  { name: 'Repuesto Limpia Vidrios', price: 8697, category: 'Hogar' },
  { name: 'Repuesto Desengrasante Multiusos', price: 9664, category: 'Hogar' },
  { name: 'Repuesto Limpia Pisos', price: 8697, category: 'Hogar' },
  { name: 'Repuesto Lustra Muebles', price: 9664, category: 'Hogar' },
]

async function main() {
  console.log('=' .repeat(70))
  console.log('VERIFY AND FIX ALL PRODUCT PRICES')
  console.log('=' .repeat(70))
  console.log('')

  let correct = 0
  let fixed = 0
  let notFound = 0

  for (const item of CORRECT_PRICES) {
    // Try exact match first
    let product = await prisma.product.findFirst({
      where: {
        name: { equals: item.name, mode: 'insensitive' }
      }
    })

    // Try partial match if not found
    if (!product) {
      product = await prisma.product.findFirst({
        where: {
          name: { contains: item.name.split('(')[0].trim(), mode: 'insensitive' }
        }
      })
    }

    if (!product) {
      console.log(`❌ NOT FOUND: ${item.name}`)
      notFound++
      continue
    }

    const currentPrice = Number(product.price)
    const expectedPrice = item.price
    const currentPriceIVA = Math.round(currentPrice * 1.19)
    const expectedPriceIVA = Math.round(expectedPrice * 1.19)

    if (currentPrice === expectedPrice) {
      console.log(`✅ ${product.name}`)
      console.log(`   Price: $${currentPrice.toLocaleString('es-CO')} (+IVA: $${currentPriceIVA.toLocaleString('es-CO')})`)
      correct++
    } else {
      // Fix the price
      await prisma.product.update({
        where: { id: product.id },
        data: { price: expectedPrice }
      })

      console.log(`🔧 FIXED: ${product.name}`)
      console.log(`   Was: $${currentPrice.toLocaleString('es-CO')} (+IVA: $${currentPriceIVA.toLocaleString('es-CO')})`)
      console.log(`   Now: $${expectedPrice.toLocaleString('es-CO')} (+IVA: $${expectedPriceIVA.toLocaleString('es-CO')})`)
      fixed++
    }
    console.log('')
  }

  console.log('=' .repeat(70))
  console.log('SUMMARY')
  console.log('=' .repeat(70))
  console.log(`✅ Correct: ${correct} products`)
  console.log(`🔧 Fixed: ${fixed} products`)
  console.log(`❌ Not found: ${notFound} products`)
  console.log('')
  console.log(`Total verified: ${CORRECT_PRICES.length} products`)
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
