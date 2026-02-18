/**
 * Update Institucional Products — Final 2026 Prices
 *
 * Run with: npx tsx scripts/update-institucional-2026.ts
 *
 * Actions:
 * 1. Deactivates 2 products no longer in the institutional line
 * 2. Updates prices for 9 existing products
 * 3. Renames 1 product (adds "Institucional" to name)
 * 4. Creates 1 new product (Limpiador de Superficies Institucional 1L)
 *
 * All prices stored sin IVA (19% tax applied at display/order time)
 * Source: "Lista de Precios Institucional 2026" — column PRECIO SUGERIDO VENTA PUBLICO
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// 1. PRODUCTS TO DEACTIVATE (not in new price list)
// ============================================
const DEACTIVATE = [
  'Limpia Vidrios Institucional Concentrado (250 ml)',
  'Limpiador de Superficies Listo Para Usar (500 ml)',
]

// ============================================
// 2. PRODUCTS TO UPDATE PRICE (sin IVA)
// Calculated as: PRECIO SUGERIDO VENTA PUBLICO / 1.19
// ============================================
const PRICE_UPDATES = [
  { name: 'Limpia Vidrios Institucional Concentrado (1 l)', price: 50543 },
  { name: 'Desengrasante Institucional Concentrado (1 gal)', price: 270105 },
  { name: 'Desengrasante Institucional Concentrado (1 l)', price: 91807 },
  { name: 'Limpia Pisos Institucional Concentrado (1 gal)', price: 54118 },
  { name: 'Limpia Pisos Institucional Concentrado (2 l)', price: 34210 },
  { name: 'Limpia Pisos Institucional Concentrado (1 l)', price: 22807 },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (1 gal)', price: 111038 },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (2 l)', price: 72383 },
  { name: 'Detergente Máquina Lavavajillas Listo Para Usar (1 l)', price: 47836 },
]

// ============================================
// 3. PRODUCT TO RENAME + UPDATE PRICE
// ============================================
const RENAME = {
  oldName: 'Limpiador de Superficies Listo Para Usar (1 gal)',
  newName: 'Limpiador de Superficies Institucional Listo Para Usar (1 gal)',
  price: 138193,
}

// ============================================
// 4. NEW PRODUCT TO CREATE
// ============================================
const NEW_PRODUCT = {
  name: 'Limpiador de Superficies Institucional Listo Para Usar (1 l)',
  category: 'Institucional',
  unit: 'und',
  price: 40202,
  stock: 0,
  minStock: 5,
}

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE INSTITUCIONAL — Final 2026 Prices')
  console.log('='.repeat(60))
  console.log('')

  // --- STEP 1: Deactivate ---
  console.log('--- STEP 1: Deactivate products not in new list ---')
  for (const name of DEACTIVATE) {
    const product = await prisma.product.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: ${name}`)
      continue
    }

    if (!product.active) {
      console.log(`⏭️  ALREADY INACTIVE: ${name}`)
      continue
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { active: false }
    })
    console.log(`🔴 DEACTIVATED: ${name}`)
  }
  console.log('')

  // --- STEP 2: Update prices ---
  console.log('--- STEP 2: Update prices ---')
  for (const item of PRICE_UPDATES) {
    const product = await prisma.product.findFirst({
      where: { name: { equals: item.name, mode: 'insensitive' } }
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: ${item.name}`)
      continue
    }

    const oldPrice = Number(product.price)
    const oldPriceIVA = Math.round(oldPrice * 1.19)
    const newPriceIVA = Math.round(item.price * 1.19)

    await prisma.product.update({
      where: { id: product.id },
      data: { price: item.price }
    })

    console.log(`✅ ${item.name}`)
    console.log(`   Old: $${oldPrice.toLocaleString('es-CO')} (+IVA: $${oldPriceIVA.toLocaleString('es-CO')})`)
    console.log(`   New: $${item.price.toLocaleString('es-CO')} (+IVA: $${newPriceIVA.toLocaleString('es-CO')})`)
  }
  console.log('')

  // --- STEP 3: Rename + update price ---
  console.log('--- STEP 3: Rename + update price ---')
  const renameProduct = await prisma.product.findFirst({
    where: { name: { equals: RENAME.oldName, mode: 'insensitive' } }
  })

  if (!renameProduct) {
    console.log(`⚠️  NOT FOUND: ${RENAME.oldName}`)
  } else {
    const oldPrice = Number(renameProduct.price)
    await prisma.product.update({
      where: { id: renameProduct.id },
      data: { name: RENAME.newName, price: RENAME.price }
    })
    console.log(`✅ RENAMED: ${RENAME.oldName}`)
    console.log(`   → ${RENAME.newName}`)
    console.log(`   Old price: $${oldPrice.toLocaleString('es-CO')} → New: $${RENAME.price.toLocaleString('es-CO')}`)
  }
  console.log('')

  // --- STEP 4: Create new product ---
  console.log('--- STEP 4: Create new product ---')
  const existing = await prisma.product.findFirst({
    where: { name: { equals: NEW_PRODUCT.name, mode: 'insensitive' } }
  })

  if (existing) {
    console.log(`⏭️  ALREADY EXISTS: ${NEW_PRODUCT.name}`)
    // Update price just in case
    await prisma.product.update({
      where: { id: existing.id },
      data: { price: NEW_PRODUCT.price, active: true }
    })
    console.log(`   Updated price to $${NEW_PRODUCT.price.toLocaleString('es-CO')}`)
  } else {
    await prisma.product.create({
      data: {
        name: NEW_PRODUCT.name,
        type: 'simple',
        category: NEW_PRODUCT.category,
        unit: NEW_PRODUCT.unit,
        price: NEW_PRODUCT.price,
        stock: NEW_PRODUCT.stock,
        minStock: NEW_PRODUCT.minStock,
        active: true,
      }
    })
    const priceIVA = Math.round(NEW_PRODUCT.price * 1.19)
    console.log(`✅ CREATED: ${NEW_PRODUCT.name}`)
    console.log(`   Price: $${NEW_PRODUCT.price.toLocaleString('es-CO')} (+IVA: $${priceIVA.toLocaleString('es-CO')})`)
  }
  console.log('')

  // --- VERIFICATION ---
  console.log('='.repeat(60))
  console.log('VERIFICATION — All Institucional Products')
  console.log('='.repeat(60))

  const allInstitucional = await prisma.product.findMany({
    where: { category: 'Institucional' },
    orderBy: { name: 'asc' }
  })

  for (const p of allInstitucional) {
    const price = Number(p.price)
    const priceIVA = Math.round(price * 1.19)
    const status = p.active ? '🟢' : '🔴'
    console.log(`${status} ${p.name}`)
    console.log(`   $${price.toLocaleString('es-CO')} (+IVA: $${priceIVA.toLocaleString('es-CO')}) ${!p.active ? '[INACTIVE]' : ''}`)
  }

  const activeCount = allInstitucional.filter(p => p.active).length
  const inactiveCount = allInstitucional.filter(p => !p.active).length
  console.log('')
  console.log(`Active: ${activeCount} | Inactive: ${inactiveCount} | Total: ${allInstitucional.length}`)
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
