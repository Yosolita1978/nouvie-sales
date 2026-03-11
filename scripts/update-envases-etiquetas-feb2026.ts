/**
 * Update Envases & Etiquetas Stock — Based on February 28, 2026 Physical Inventory
 *
 * Run with: npx tsx scripts/update-envases-etiquetas-feb2026.ts
 *
 * Source: Client inventory spreadsheet (INVENTARIO FEBRERO 28-2026.xlsx)
 *
 * Actions:
 *   - Rename envases/etiquetas to match new naming convention
 *   - Update stock for renamed and existing items
 *   - Create new items that didn't exist before
 *   - Old items NOT in new inventory are left untouched
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RenameUpdate {
  oldName: string
  newName: string
  stock: number
  note: string
}

interface StockUpdate {
  namePattern: string
  stock: number
  note: string
}

interface NewItem {
  name: string
  category: string
  stock: number
  price: number
  note: string
}

// ============================================
// ENVASES — RENAMES (old name → new name + stock)
// ============================================
const ENVASE_RENAMES: RenameUpdate[] = [
  { oldName: 'Envases bala PET 250 ml', newName: 'Envase 250 ml Reciclado', stock: 124, note: 'ANA: 124' },
  { oldName: 'Envase 2 litros cuadrado', newName: 'Envase 2 Litros Rectangular', stock: 6, note: 'ANA: 6' },
  { oldName: 'Envase redondo 60 ml', newName: 'Envase 60 ml', stock: 62, note: 'ANA: 62' },
  { oldName: 'Tapa azul', newName: 'Tapas Galón y Litro Azules', stock: 33, note: 'ANA: 33' },
  { oldName: 'Tapon', newName: 'Tapón', stock: 45, note: 'ANA: 45' },
  { oldName: 'Tapa envase bala blanca', newName: 'Tapa 250 ml', stock: 178, note: 'NENA: 16 + ANA: 162' },
  { oldName: 'Espumero blanco (baño)', newName: 'Espumeros 150 ml', stock: 45, note: 'ANA: 45' },
  { oldName: 'Envase Bidone Nouvie (con tapa)', newName: 'Envase 20 Litros', stock: 0, note: 'ANA: 0' },
  { oldName: 'Envase Galón cuadrado', newName: 'Envase Galón 4 Litros Cuadrado', stock: 0, note: 'ANA: 0' },
  { oldName: 'Pistolas atomizadores (institucional)', newName: 'Pistola Gatillo Transparente 24 ml', stock: 23, note: 'NENA: 10 + ANA: 13' },
  { oldName: 'Pistolas atomizadores (hogar)', newName: 'Pistola Gatillo Cuadrado 28 ml', stock: 14, note: 'ANA: 14' },
]

// ============================================
// ENVASES — STOCK UPDATE ONLY (name stays)
// ============================================
const ENVASE_STOCK_UPDATES: StockUpdate[] = [
  { namePattern: 'Envase 1 litro redondo', stock: 9, note: 'ANA: 9' },
  { namePattern: 'Envase 2 litros redondo', stock: 5, note: 'ANA: 5' },
]

// ============================================
// ENVASES — NEW ITEMS (create in DB)
// ============================================
const ENVASE_NEW: NewItem[] = [
  { name: 'Envase 250 ml Reciclado sin etiqueta', category: 'Envases', stock: 89, price: 3000, note: 'ANA: 89' },
  { name: 'Envase 1 Litro Rectangular Transparente Ultrabac', category: 'Envases', stock: 7, price: 5000, note: 'ANA: 7' },
  { name: 'Envase 1 Litro Rectangular Opaco Ultrabac', category: 'Envases', stock: 4, price: 5000, note: 'ANA: 4' },
  { name: 'Envase 1 Litro Rectangular Opaco', category: 'Envases', stock: 2, price: 5000, note: 'ANA: 2' },
  { name: 'Envase Galón 3785 ml', category: 'Envases', stock: 14, price: 8000, note: 'ANA: 14' },
  { name: 'Envase 20 ml', category: 'Envases', stock: 0, price: 3000, note: 'ANA: 0' },
  { name: 'Envase 500 ml Transparente', category: 'Envases', stock: 1, price: 3000, note: 'ANA: 1' },
  { name: 'Envase 500 ml Blanco', category: 'Envases', stock: 30, price: 3000, note: 'ANA: 30' },
  { name: 'Envase 500 ml Reciclado Bajito', category: 'Envases', stock: 5, price: 3000, note: 'ANA: 5' },
  { name: 'Tapas Galón y Litro Blancas', category: 'Envases', stock: 2, price: 3000, note: 'ANA: 2' },
  { name: 'Tapa Envase Pequeño Amarillo', category: 'Envases', stock: 38, price: 3000, note: 'ANA: 38' },
  { name: 'Tapa Envase Pequeño Transparente', category: 'Envases', stock: 23, price: 3000, note: 'ANA: 23' },
  { name: 'Tapa Envase Pequeño Blanco', category: 'Envases', stock: 5, price: 3000, note: 'ANA: 5' },
  { name: 'Spray Envase Pequeño', category: 'Envases', stock: 4, price: 3000, note: 'ANA: 4' },
  { name: 'Espumeros 60 ml', category: 'Envases', stock: 4, price: 3000, note: 'ANA: 4' },
  { name: 'Envase 500 ml Bioptimo', category: 'Envases', stock: 10, price: 3000, note: 'ANA: 10' },
]

// ============================================
// ETIQUETAS — RENAMES (old name → new name + stock)
// ============================================
const ETIQUETA_RENAMES: RenameUpdate[] = [
  // 250ml etiquetas (back labels only)
  { oldName: 'Desengrasante 250 ml', newName: 'Desengrasante Multiusos 250 ml (atras)', stock: 45, note: 'atras: 45' },
  { oldName: 'Lavavajilla 250 ml', newName: 'Detergente Neutro 250 ml (atras)', stock: 39, note: 'atras: 39' },
  { oldName: 'Limpia Vidrios 250 ml', newName: 'Limpia Vidrios 250 ml (atras)', stock: 11, note: 'atras: 11' },
  { oldName: 'Limpia Pisos 250 ml', newName: 'Limpia Pisos 250 ml (atras)', stock: 0, note: 'atras: 0' },
  { oldName: 'Lustra Muebles 250 ml', newName: 'Lustra Muebles 250 ml (atras)', stock: 0, note: 'atras: 0' },

  // Larger format — institucional → multiusos renames
  { oldName: 'Desengrasante institucional 1 galon (frente)', newName: 'Desengrasante Multiusos Galón (frente)', stock: 7, note: 'frente: 7' },
  { oldName: 'Desengrasante institucional 1 galon (atras)', newName: 'Desengrasante Multiusos Galón (atras)', stock: 1, note: 'atras: 1' },
  { oldName: 'Desengrasante institucional 1 litro (frente)', newName: 'Desengrasante Multiusos 1 LT (frente)', stock: 4, note: 'adelante: 4' },

  // Limpia Vidrios galón — rename (remove "1" prefix)
  { oldName: 'Limpia Vidrios 1 galon (frente)', newName: 'Limpia Vidrios Galón (frente)', stock: 16, note: 'frente: 16' },
  { oldName: 'Limpia Vidrios 1 galon (atras)', newName: 'Limpia Vidrios Galón (atras)', stock: 1, note: 'atras: 1' },

  // Limpia Vidrios 1 litro — was "institucional", now generic
  { oldName: 'Limpia vidios institucional 1 litro (frente)', newName: 'Limpia Vidrios 1 Litro', stock: 8, note: 'total: 8' },

  // Limpia Pisos — single labels now (no front/back distinction)
  { oldName: 'Limpia Pisos 1 litro (frente)', newName: 'Limpia Pisos 1 Litro', stock: 6, note: 'total: 6' },
  { oldName: 'Limpia Pisos 1 galon (frente)', newName: 'Limpia Pisos Galón', stock: 5, note: 'total: 5' },

  // Detergente Lavavajillas galón — single label now
  { oldName: 'Detergente Lavavajillas 1 galon (frente)', newName: 'Detergente Lava Vajilla Galón', stock: 6, note: 'total: 6' },

  // 500ml dosificadores — rename
  { oldName: 'Desengrasante institucional 500 ml', newName: 'Dosificador Desengrasante 500 ml', stock: 14, note: 'total: 14' },
  { oldName: 'Limpia vidrios 500 ml', newName: 'Dosificador Limpia Vidrios 500 ml', stock: 10, note: 'total: 10' },
  { oldName: 'Limpia superficies 500 ml', newName: 'Dosificador Limpia Superficies 500 ml', stock: 8, note: 'total: 8' },

  // Ultrabac — rename frente labels to new names
  { oldName: 'Sanitizante azul frente Ultrabac', newName: 'Sanitizante', stock: 5, note: 'total: 5' },
  { oldName: 'Desincrustante rosado frente Ultrabac', newName: 'Desincrustante 1 LT', stock: 8, note: 'total: 8' },
  { oldName: 'Desengrasante amarillo frente Ultrabac', newName: 'Desengrasante Ultrabac', stock: 8, note: 'total: 8' },
]

// ============================================
// ETIQUETAS — NEW ITEMS (create in DB)
// ============================================
const ETIQUETA_NEW: NewItem[] = [
  // Detergente Lava Vajilla (new product line labels)
  { name: 'Detergente Lava Vajilla 1 Litro (frente)', category: 'Etiquetas', stock: 1, price: 500, note: 'frente: 1' },
  { name: 'Detergente Lava Vajilla 1 Litro (atras)', category: 'Etiquetas', stock: 4, price: 500, note: 'atras: 4' },
  { name: 'Detergente Lava Vajilla 1 Litro Redondo', category: 'Etiquetas', stock: 2, price: 500, note: 'total: 2' },
  { name: 'Detergente Lava Vajilla 2 Litro Redondo', category: 'Etiquetas', stock: 1, price: 500, note: 'total: 1' },

  // Lustra Muebles (new sizes)
  { name: 'Lustra Muebles 2 Litros (frente)', category: 'Etiquetas', stock: 13, price: 500, note: 'frente: 13' },
  { name: 'Lustra Muebles 2 Litros (atras)', category: 'Etiquetas', stock: 2, price: 500, note: 'atras: 2' },
  { name: 'Lustra Muebles 2 Litros Redondo', category: 'Etiquetas', stock: 2, price: 500, note: 'total: 2' },
  { name: 'Lustra Muebles Galón', category: 'Etiquetas', stock: 3, price: 500, note: 'total: 3' },

  // Dosificadores (new labels)
  { name: 'Dosificador Limpia Pisos 500 ml', category: 'Etiquetas', stock: 16, price: 500, note: 'total: 16' },
  { name: 'Dosificador Lavavajillas 500 ml', category: 'Etiquetas', stock: 11, price: 500, note: 'total: 11' },
]

// ============================================
// EXECUTION
// ============================================

async function renameAndUpdate(items: RenameUpdate[], label: string) {
  console.log(`\n--- ${label}: RENAMES ---`)
  let updated = 0
  let notFound = 0

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { name: { equals: item.oldName, mode: 'insensitive' }, active: true },
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: "${item.oldName}"`)
      notFound++
      continue
    }

    const oldStock = product.stock
    await prisma.product.update({
      where: { id: product.id },
      data: { name: item.newName, stock: item.stock },
    })

    console.log(`✅ "${item.oldName}" → "${item.newName}"`)
    console.log(`   Stock: ${oldStock} → ${item.stock} (${item.note})`)
    updated++
  }

  console.log(`   Renamed: ${updated} | Not found: ${notFound}`)
  return { updated, notFound }
}

async function updateStock(items: StockUpdate[], label: string) {
  console.log(`\n--- ${label}: STOCK UPDATES ---`)
  let updated = 0
  let notFound = 0

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { name: { equals: item.namePattern, mode: 'insensitive' }, active: true },
    })

    if (!product) {
      console.log(`⚠️  NOT FOUND: "${item.namePattern}"`)
      notFound++
      continue
    }

    const oldStock = product.stock
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: item.stock },
    })

    console.log(`✅ ${item.namePattern}`)
    console.log(`   Stock: ${oldStock} → ${item.stock} (${item.note})`)
    updated++
  }

  console.log(`   Updated: ${updated} | Not found: ${notFound}`)
  return { updated, notFound }
}

async function createNewItems(items: NewItem[], label: string) {
  console.log(`\n--- ${label}: NEW ITEMS ---`)
  let created = 0

  for (const item of items) {
    const existing = await prisma.product.findFirst({
      where: { name: { equals: item.name, mode: 'insensitive' } },
    })

    if (existing) {
      console.log(`⏭️  ALREADY EXISTS: "${item.name}" (stock: ${existing.stock})`)
      continue
    }

    await prisma.product.create({
      data: {
        name: item.name,
        type: 'simple',
        category: item.category,
        unit: 'und',
        price: item.price,
        stock: item.stock,
        minStock: 5,
        active: true,
      },
    })

    console.log(`🆕 Created: "${item.name}" (stock: ${item.stock})`)
    created++
  }

  console.log(`   Created: ${created}`)
  return { created }
}

async function main() {
  console.log('='.repeat(60))
  console.log('UPDATE ENVASES & ETIQUETAS — February 28, 2026 Inventory')
  console.log('='.repeat(60))

  // ENVASES
  const er = await renameAndUpdate(ENVASE_RENAMES, 'ENVASES')
  const es = await updateStock(ENVASE_STOCK_UPDATES, 'ENVASES')
  const en = await createNewItems(ENVASE_NEW, 'ENVASES')

  // ETIQUETAS
  const etr = await renameAndUpdate(ETIQUETA_RENAMES, 'ETIQUETAS')
  const etn = await createNewItems(ETIQUETA_NEW, 'ETIQUETAS')

  // SUMMARY
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Envases   — Renamed: ${er.updated}, Stock updated: ${es.updated}, Created: ${en.created}`)
  console.log(`Etiquetas — Renamed: ${etr.updated}, Created: ${etn.created}`)
  console.log(`Not found — Envases: ${er.notFound + es.notFound}, Etiquetas: ${etr.notFound}`)

  // Final overview
  console.log('\n' + '='.repeat(60))
  console.log('STOCK OVERVIEW — ENVASES & ETIQUETAS')
  console.log('='.repeat(60))

  for (const cat of ['Envases', 'Etiquetas']) {
    const products = await prisma.product.findMany({
      where: { category: cat, active: true },
      orderBy: { name: 'asc' },
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
