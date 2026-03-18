/**
 * Update Product Stock — March 18, 2026 Partial Update (Hogar 250ml)
 *
 * Run with: npx tsx scripts/update-stock-mar2026-hogar.ts
 *
 * Source: Client inventory update
 * Updates: Limpia Vidrios and Lustra Muebles 250ml units
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface StockUpdate {
  namePattern: string
  stock: number
  note: string
}

const HOGAR_250ML: StockUpdate[] = [
  { namePattern: 'Limpia Vidrios Concentrado (250 ml)', stock: 50, note: 'New stock received' },
  { namePattern: 'Lustra Muebles Concentrado (250 ml)', stock: 9, note: 'Updated count' },
]

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE STOCK — March 18, 2026 (Hogar 250ml)')
  console.log('='.repeat(60))
  console.log('')

  let updated = 0
  let notFound = 0

  for (const item of HOGAR_250ML) {
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

  console.log('')
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Updated: ${updated}`)
  console.log(`Not found: ${notFound}`)

  const products = await prisma.product.findMany({
    where: { category: 'Hogar', active: true },
    orderBy: { name: 'asc' }
  })
  console.log(`\n--- Hogar (${products.length} active) ---`)
  for (const p of products) {
    const stockLabel = p.stock === 0 ? '⚠️ AGOTADO' : `${p.stock}`
    console.log(`  ${p.name}: ${stockLabel} ${p.unit}`)
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
