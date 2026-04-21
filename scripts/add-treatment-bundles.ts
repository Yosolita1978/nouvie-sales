/**
 * Add Treatment Bundles to Database
 *
 * Run with: npx tsx scripts/add-treatment-bundles.ts
 *
 * Adds the 3 capilar treatment bundles with their special bundle prices.
 * Prices are stored sin IVA (the website adds 19% when displaying).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Bundle prices con IVA from client (updated April 2026):
// - Tratamiento Suave y Liso (3 products): $188,000
// - Tratamiento Reparación Intensa (3 products): $158,000
// - Tratamiento Revitalizante (2 products): $96,000
//
// Stored sin IVA:
// - $188,000 / 1.19 = $157,983
// - $158,000 / 1.19 = $132,773
// - $96,000 / 1.19 = $80,672

const TREATMENT_BUNDLES = [
  {
    name: 'Tratamiento Suave y Liso',
    category: 'Capilar',
    price: 157983, // $188,000 con IVA
    unit: 'kit',
    description: 'Kit de 3 productos: Shampoo, Mascarilla y Loción Suave y Liso'
  },
  {
    name: 'Tratamiento Reparación Intensa',
    category: 'Capilar',
    price: 132773, // $158,000 con IVA
    unit: 'kit',
    description: 'Kit de 3 productos: Shampoo, Mascarilla y Loción Reparación Intensa'
  },
  {
    name: 'Tratamiento Revitalizante',
    category: 'Capilar',
    price: 80672, // $96,000 con IVA
    unit: 'kit',
    description: 'Kit de 2 productos: Shampoo y Loción Revitalizante'
  }
]

async function main() {
  console.log('=' .repeat(60))
  console.log('ADD TREATMENT BUNDLES TO DATABASE')
  console.log('=' .repeat(60))
  console.log('')

  for (const treatment of TREATMENT_BUNDLES) {
    // Check if already exists
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: treatment.name, mode: 'insensitive' }
      }
    })

    if (existing) {
      // Update existing
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          price: treatment.price,
          category: treatment.category,
          unit: treatment.unit,
          active: true
        }
      })
      const priceIVA = Math.round(treatment.price * 1.19)
      console.log(`✅ UPDATED: ${treatment.name}`)
      console.log(`   Price: $${treatment.price.toLocaleString('es-CO')} (+IVA: $${priceIVA.toLocaleString('es-CO')})`)
    } else {
      // Create new
      await prisma.product.create({
        data: {
          name: treatment.name,
          type: 'simple',
          category: treatment.category,
          price: treatment.price,
          unit: treatment.unit,
          stock: 100,
          active: true
        }
      })
      const priceIVA = Math.round(treatment.price * 1.19)
      console.log(`✅ CREATED: ${treatment.name}`)
      console.log(`   Price: $${treatment.price.toLocaleString('es-CO')} (+IVA: $${priceIVA.toLocaleString('es-CO')})`)
    }
    console.log('')
  }

  console.log('=' .repeat(60))
  console.log('VERIFICATION')
  console.log('=' .repeat(60))

  const treatments = await prisma.product.findMany({
    where: {
      name: { contains: 'Tratamiento', mode: 'insensitive' }
    },
    orderBy: { name: 'asc' }
  })

  for (const t of treatments) {
    const price = Number(t.price)
    const priceIVA = Math.round(price * 1.19)
    console.log(`${t.name}`)
    console.log(`   $${price.toLocaleString('es-CO')} sin IVA → $${priceIVA.toLocaleString('es-CO')} con IVA`)
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
