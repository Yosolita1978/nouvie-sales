/**
 * Create New Products Script — Full Catalog Update 2026
 *
 * Run with: npx tsx scripts/create-new-products.ts
 *
 * This script creates:
 * 1. Missing Hogar 250ml Concentrados (5 products)
 * 2. Atomizadores (3 products)
 * 3. Kits (5 products)
 * 4. Repuestos (5 products)
 * 5. Institucional (12 products)
 * 6. Ordeño (3 products)
 *
 * Total: 33 new products
 *
 * NOTE: Prices are stored WITHOUT IVA (sin IVA)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// PRODUCT DEFINITIONS
// All prices are sin IVA
// ============================================

interface NewProduct {
  name: string
  category: string
  unit: string
  price: number
  stock: number
  minStock: number
}

// Section 1: Hogar 250ml Concentrados (MISSING — need to create)
const HOGAR_250ML: NewProduct[] = [
  { name: 'Detergente Neutro Concentrado (250 ml)', category: 'Hogar', unit: 'und', price: 46387, stock: 0, minStock: 10 },
  { name: 'Desengrasante Multiusos Concentrado (250 ml)', category: 'Hogar', unit: 'und', price: 46387, stock: 0, minStock: 10 },
  { name: 'Limpia Vidrios Concentrado (250 ml)', category: 'Hogar', unit: 'und', price: 43487, stock: 0, minStock: 10 },
  { name: 'Lustra Muebles Concentrado (250 ml)', category: 'Hogar', unit: 'und', price: 43487, stock: 0, minStock: 10 },
  { name: 'Limpia Pisos Concentrado (250 ml)', category: 'Hogar', unit: 'und', price: 43487, stock: 0, minStock: 10 },
]

// Section 3: Atomizadores
const ATOMIZADORES: NewProduct[] = [
  { name: 'Atomizador Desengrasante Multiusos (500 ml)', category: 'Hogar', unit: 'und', price: 4832, stock: 0, minStock: 10 },
  { name: 'Atomizador Detergente Neutro (500 ml)', category: 'Hogar', unit: 'und', price: 4832, stock: 0, minStock: 10 },
  { name: 'Atomizador Lustra Muebles (500 ml)', category: 'Hogar', unit: 'und', price: 4832, stock: 0, minStock: 10 },
]

// Section 4: Kits
const KITS: NewProduct[] = [
  { name: 'Kit Lavavajilla', category: 'Hogar', unit: 'und', price: 12805, stock: 0, minStock: 5 },
  { name: 'Kit Limpia Vidrios', category: 'Hogar', unit: 'und', price: 12100, stock: 0, minStock: 5 },
  { name: 'Kit Desengrasante Multiusos', category: 'Hogar', unit: 'und', price: 13336, stock: 0, minStock: 5 },
  { name: 'Kit Limpia Pisos', category: 'Hogar', unit: 'und', price: 11887, stock: 0, minStock: 5 },
  { name: 'Kit Lustra Muebles', category: 'Hogar', unit: 'und', price: 13336, stock: 0, minStock: 5 },
]

// Section 5: Repuestos
const REPUESTOS: NewProduct[] = [
  { name: 'Repuesto Lavavajilla', category: 'Hogar', unit: 'und', price: 9664, stock: 0, minStock: 5 },
  { name: 'Repuesto Limpia Vidrios', category: 'Hogar', unit: 'und', price: 8697, stock: 0, minStock: 5 },
  { name: 'Repuesto Desengrasante Multiusos', category: 'Hogar', unit: 'und', price: 9664, stock: 0, minStock: 5 },
  { name: 'Repuesto Limpia Pisos', category: 'Hogar', unit: 'und', price: 8697, stock: 0, minStock: 5 },
  { name: 'Repuesto Lustra Muebles', category: 'Hogar', unit: 'und', price: 9664, stock: 0, minStock: 5 },
]

// Section 6: Institucional
const INSTITUCIONAL: NewProduct[] = [
  { name: 'Limpia Vidrios Institucional Concentrado (1 l)', category: 'Institucional', unit: 'und', price: 50543, stock: 0, minStock: 5 },
  { name: 'Limpia Vidrios Institucional Concentrado (250 ml)', category: 'Institucional', unit: 'und', price: 14882, stock: 0, minStock: 5 },
  { name: 'Desengrasante Institucional Concentrado (1 gal)', category: 'Institucional', unit: 'und', price: 270105, stock: 0, minStock: 5 },
  { name: 'Desengrasante Institucional Concentrado (1 l)', category: 'Institucional', unit: 'und', price: 91807, stock: 0, minStock: 5 },
  { name: 'Limpia Pisos Institucional Concentrado (1 gal)', category: 'Institucional', unit: 'und', price: 54118, stock: 0, minStock: 5 },
  { name: 'Limpia Pisos Institucional Concentrado (2 l)', category: 'Institucional', unit: 'und', price: 34210, stock: 0, minStock: 5 },
  { name: 'Limpia Pisos Institucional Concentrado (1 l)', category: 'Institucional', unit: 'und', price: 22807, stock: 0, minStock: 5 },
  { name: 'Limpiador de Superficies Listo Para Usar (1 gal)', category: 'Institucional', unit: 'und', price: 138193, stock: 0, minStock: 5 },
  { name: 'Limpiador de Superficies Listo Para Usar (500 ml)', category: 'Institucional', unit: 'und', price: 25996, stock: 0, minStock: 5 },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (1 gal)', category: 'Institucional', unit: 'und', price: 111038, stock: 0, minStock: 5 },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (2 l)', category: 'Institucional', unit: 'und', price: 72382, stock: 0, minStock: 5 },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (1 l)', category: 'Institucional', unit: 'und', price: 47837, stock: 0, minStock: 5 },
]

// Section 7: Ordeño (NEW CATEGORY)
const ORDENO: NewProduct[] = [
  { name: 'Detergente Alcalino (1 l)', category: 'Ordeño', unit: 'und', price: 116159, stock: 0, minStock: 5 },
  { name: 'Desincrustante (1 l)', category: 'Ordeño', unit: 'und', price: 116159, stock: 0, minStock: 5 },
  { name: 'Sanitizante (1 l)', category: 'Ordeño', unit: 'und', price: 62815, stock: 0, minStock: 5 },
]

// Combine all products
const ALL_NEW_PRODUCTS: NewProduct[] = [
  ...HOGAR_250ML,
  ...ATOMIZADORES,
  ...KITS,
  ...REPUESTOS,
  ...INSTITUCIONAL,
  ...ORDENO,
]

async function main() {
  console.log('=' .repeat(60))
  console.log('CREATE NEW PRODUCTS — Full Catalog Update 2026')
  console.log('=' .repeat(60))
  console.log('')
  console.log(`Total products to create: ${ALL_NEW_PRODUCTS.length}`)
  console.log('')

  let created = 0
  let skipped = 0
  let errors: string[] = []

  for (const product of ALL_NEW_PRODUCTS) {
    try {
      // Check if product already exists (by exact name)
      const existing = await prisma.product.findFirst({
        where: {
          name: {
            equals: product.name,
            mode: 'insensitive'
          }
        }
      })

      if (existing) {
        console.log(`⏭️  SKIPPED (exists): ${product.name}`)
        skipped++
        continue
      }

      // Create the product
      await prisma.product.create({
        data: {
          name: product.name,
          type: 'simple',
          category: product.category,
          unit: product.unit,
          price: product.price,
          stock: product.stock,
          minStock: product.minStock,
          active: true,
        }
      })

      const priceWithIVA = Math.round(product.price * 1.19)
      console.log(`✅ ${product.name}`)
      console.log(`   Category: ${product.category}`)
      console.log(`   Price: $${product.price.toLocaleString('es-CO')} (+IVA: $${priceWithIVA.toLocaleString('es-CO')})`)
      console.log('')

      created++
    } catch (error) {
      const msg = `Error creating ${product.name}: ${error}`
      console.log(`❌ ${msg}`)
      errors.push(msg)
    }
  }

  // Summary
  console.log('=' .repeat(60))
  console.log('SUMMARY')
  console.log('=' .repeat(60))
  console.log(`Created: ${created} products`)
  console.log(`Skipped: ${skipped} products (already exist)`)

  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`)
    for (const err of errors) {
      console.log(`  - ${err}`)
    }
  }

  // Final count by category
  console.log('')
  console.log('=' .repeat(60))
  console.log('FINAL PRODUCT COUNT BY CATEGORY')
  console.log('=' .repeat(60))

  const categories = ['Hogar', 'Capilar', 'Institucional', 'Ordeño']
  for (const cat of categories) {
    const count = await prisma.product.count({
      where: { category: cat, active: true }
    })
    console.log(`${cat}: ${count} products`)
  }

  const totalActive = await prisma.product.count({ where: { active: true } })
  console.log(`\nTotal active products: ${totalActive}`)
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
