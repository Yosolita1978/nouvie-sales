/**
 * Update Product Stock — Based on February 28, 2026 Physical Inventory
 *
 * Run with: npx tsx scripts/update-stock-feb2026.ts
 *
 * Source: Client inventory count (WhatsApp image, Feb 28 2026)
 * Locations: NENA, ANA, FINCA
 *
 * Updates: Capilar (units), Hogar 250ml (units), Productos bulk (ml)
 * Unchanged: Kits, Atomizadores, Repuestos, Tratamientos, Institucional, Ordeño
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface StockUpdate {
  namePattern: string
  stock: number
  note: string
}

// Capilar — direct unit count (NENA + ANA + FINCA)
// Mapping: Kiwi y Acai = Suave y Liso, Honey & Melon = Reparación intensa
const CAPILAR: StockUpdate[] = [
  { namePattern: 'Shampoo Suave y Liso (237 ml)', stock: 627, note: '14 + 37 + 576' },
  { namePattern: 'Shampoo Reparación intensa (237 ml)', stock: 312, note: '13 + 47 + 252' },
  { namePattern: 'Shampoo Revitalizante (237 ml)', stock: 246, note: '12 + 18 + 216' },
  { namePattern: 'Loción Suave y Liso (177 ml)', stock: 575, note: '19 + 52 + 504' },
  { namePattern: 'Loción Reparación intensa (177 ml)', stock: 531, note: '40 + 59 + 432' },
  { namePattern: 'Loción Revitalizante (177 ml)', stock: 661, note: '8 + 5 + 648' },
  { namePattern: 'Mascarilla Suave y Liso (177 ml)', stock: 621, note: '30 + 51 + 540' },
  { namePattern: 'Mascarilla Reparación intensa (177 ml)', stock: 532, note: '11 + 53 + 468' },
]

// Hogar 250ml — direct unit count (NENA + ANA)
const HOGAR_250ML: StockUpdate[] = [
  { namePattern: 'Desengrasante Multiusos Concentrado (250 ml)', stock: 81, note: '36 + 45' },
  { namePattern: 'Detergente Neutro Concentrado (250 ml)', stock: 286, note: '50 + 236' },
  { namePattern: 'Limpia Vidrios Concentrado (250 ml)', stock: 0, note: '4 owed to Patricia Echeverri' },
  { namePattern: 'Limpia Pisos Concentrado (250 ml)', stock: 17, note: '5 + 12' },
  { namePattern: 'Lustra Muebles Concentrado (250 ml)', stock: 4, note: '4 (NENA only)' },
]

// Productos bulk — ml totals (tracked separately from 250ml units)
const PRODUCTOS_BULK: StockUpdate[] = [
  { namePattern: 'Desengrasante Multiusos', stock: 52990, note: '14 x 3785ml containers' },
  { namePattern: 'Limpia Pisos', stock: 112000, note: '15x4L + 17x2L + 9x2L' },
  { namePattern: 'Lustra Muebles', stock: 30375, note: '81 x 375ml containers (6+6+69)' },
  { namePattern: 'Limpia Vidrios', stock: 0, note: '0 — owed to Patricia Echeverri' },
]

const ALL_UPDATES: StockUpdate[] = [
  ...CAPILAR,
  ...HOGAR_250ML,
  ...PRODUCTOS_BULK,
]

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE STOCK — February 28, 2026 Inventory')
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

  // Final overview of affected categories
  console.log('')
  console.log('='.repeat(60))
  console.log('STOCK OVERVIEW — AFFECTED PRODUCTS')
  console.log('='.repeat(60))

  const categories = ['Capilar', 'Hogar', 'Productos']
  for (const cat of categories) {
    const products = await prisma.product.findMany({
      where: { category: cat, active: true },
      orderBy: { name: 'asc' }
    })
    console.log(`\n--- ${cat} (${products.length} active) ---`)
    for (const p of products) {
      const stockLabel = p.stock === 0 ? '⚠️ AGOTADO' : `${p.stock}`
      console.log(`  ${p.name}: ${stockLabel} ${p.unit}`)
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
