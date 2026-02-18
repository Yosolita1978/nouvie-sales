/**
 * Update Product Stock — Based on December 2025 Inventory CSV
 *
 * Run with: npx tsx scripts/update-stock-dec2025.ts
 *
 * Source: "Admin Nouvie - Inventario(2).csv" — December 2025 "Inventario final"
 *
 * Capilar: direct unit mapping
 * Hogar: bulk ml converted to approximate units (shared across presentations)
 * Institucional: already updated, skip
 * Ordeño: no data, set reasonable default
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// STOCK UPDATES
// ============================================

interface StockUpdate {
  namePattern: string
  stock: number
  note: string
}

// Capilar — direct from CSV (units)
const CAPILAR: StockUpdate[] = [
  { namePattern: 'Shampoo Suave y Liso (237 ml)', stock: 552, note: 'Direct from CSV' },
  { namePattern: 'Shampoo Revitalizante (237 ml)', stock: 288, note: 'Direct from CSV' },
  { namePattern: 'Shampoo Reparación intensa (237 ml)', stock: 420, note: 'Direct from CSV' },
  { namePattern: 'Mascarilla Suave y Liso (177 ml)', stock: 698, note: 'Direct from CSV' },
  { namePattern: 'Mascarilla Reparación intensa (177 ml)', stock: 578, note: 'Direct from CSV' },
  { namePattern: 'Loción Suave y Liso (177 ml)', stock: 632, note: 'Direct from CSV' },
  { namePattern: 'Loción Revitalizante (177 ml)', stock: 591, note: 'Direct from CSV' },
  { namePattern: 'Loción Reparación intensa (177 ml)', stock: 712, note: 'Direct from CSV' },
]

// Hogar — bulk ml converted to units
// Detergente Lavavajillas: 83,050 ml
// Desengrasante Multiusos: 90,800 ml
// Limpia Vidrios: 6,900 ml
// Lustra Muebles: 52,845 ml
// Limpia Pisos: 341 ml

// 250ml Concentrados
const HOGAR_250ML: StockUpdate[] = [
  { namePattern: 'Detergente Neutro Concentrado (250 ml)', stock: 332, note: '83,050ml / 250' },
  { namePattern: 'Desengrasante Multiusos Concentrado (250 ml)', stock: 363, note: '90,800ml / 250' },
  { namePattern: 'Limpia Vidrios Concentrado (250 ml)', stock: 27, note: '6,900ml / 250' },
  { namePattern: 'Lustra Muebles Concentrado (250 ml)', stock: 211, note: '52,845ml / 250' },
  { namePattern: 'Limpia Pisos Concentrado (250 ml)', stock: 1, note: '341ml / 250' },
]

// Atomizadores — estimate based on bulk availability
const HOGAR_ATOMIZADORES: StockUpdate[] = [
  { namePattern: 'Atomizador Detergente Neutro (500 ml)', stock: 166, note: 'Estimate from bulk (83,050ml / 500)' },
  { namePattern: 'Atomizador Desengrasante Multiusos (500 ml)', stock: 181, note: 'Estimate from bulk (90,800ml / 500)' },
  { namePattern: 'Atomizador Lustra Muebles (500 ml)', stock: 105, note: 'Estimate from bulk (52,845ml / 500)' },
]

// Kits — estimate as half of 250ml stock (they include atomizer + concentrate)
const HOGAR_KITS: StockUpdate[] = [
  { namePattern: 'Kit Lavavajilla', stock: 166, note: 'Estimate ~half of 250ml stock' },
  { namePattern: 'Kit Desengrasante Multiusos', stock: 181, note: 'Estimate ~half of 250ml stock' },
  { namePattern: 'Kit Limpia Vidrios', stock: 13, note: 'Estimate ~half of 250ml stock' },
  { namePattern: 'Kit Lustra Muebles', stock: 105, note: 'Estimate ~half of 250ml stock' },
  { namePattern: 'Kit Limpia Pisos', stock: 1, note: 'Limited by low stock' },
]

// Repuestos — same estimate as 250ml
const HOGAR_REPUESTOS: StockUpdate[] = [
  { namePattern: 'Repuesto Lavavajilla', stock: 332, note: 'Same as 250ml estimate' },
  { namePattern: 'Repuesto Desengrasante Multiusos', stock: 363, note: 'Same as 250ml estimate' },
  { namePattern: 'Repuesto Limpia Vidrios', stock: 27, note: 'Same as 250ml estimate' },
  { namePattern: 'Repuesto Lustra Muebles', stock: 211, note: 'Same as 250ml estimate' },
  { namePattern: 'Repuesto Limpia Pisos', stock: 1, note: 'Limited by low stock' },
]

// Ordeño — no CSV data, set reasonable default
const ORDENO: StockUpdate[] = [
  { namePattern: 'Detergente Alcalino (1 l)', stock: 50, note: 'Default (no CSV data)' },
  { namePattern: 'Desincrustante (1 l)', stock: 50, note: 'Default (no CSV data)' },
  { namePattern: 'Sanitizante (1 l)', stock: 50, note: 'Default (no CSV data)' },
]

const ALL_UPDATES: StockUpdate[] = [
  ...CAPILAR,
  ...HOGAR_250ML,
  ...HOGAR_ATOMIZADORES,
  ...HOGAR_KITS,
  ...HOGAR_REPUESTOS,
  ...ORDENO,
]

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE STOCK — December 2025 Inventory')
  console.log('='.repeat(60))
  console.log('')

  let updated = 0
  let notFound = 0

  for (const item of ALL_UPDATES) {
    const product = await prisma.product.findFirst({
      where: { name: { equals: item.namePattern, mode: 'insensitive' }, active: true }
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: ${item.namePattern}`)
      notFound++
      continue
    }

    const oldStock = product.stock
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: item.stock }
    })

    console.log(`✅ ${item.namePattern}`)
    console.log(`   Stock: ${oldStock} → ${item.stock} (${item.note})`)
    updated++
  }

  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Updated: ${updated}`)
  console.log(`Not found: ${notFound}`)

  // Final overview by category
  console.log('')
  console.log('='.repeat(60))
  console.log('STOCK OVERVIEW BY CATEGORY')
  console.log('='.repeat(60))

  const categories = ['Hogar', 'Capilar', 'Institucional', 'Ordeño']
  for (const cat of categories) {
    const products = await prisma.product.findMany({
      where: { category: cat, active: true },
      orderBy: { name: 'asc' }
    })
    console.log(`\n--- ${cat} (${products.length} active) ---`)
    for (const p of products) {
      const stockLabel = p.stock === 0 ? '⚠️ AGOTADO' : `${p.stock}`
      console.log(`  ${p.name}: ${stockLabel}`)
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
