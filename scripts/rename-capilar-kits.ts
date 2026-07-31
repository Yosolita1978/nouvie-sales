/**
 * Rename the Capilar "Tratamiento" products to "Kit Completo" to match the
 * public website (nouvie.co). No new products, no price changes — names only.
 *
 * Dry run (shows what would change, writes nothing):
 *   npx tsx scripts/rename-capilar-kits.ts
 *
 * Apply the changes:
 *   npx tsx scripts/rename-capilar-kits.ts --commit
 *
 * Idempotent: if a product was already renamed, it's reported as "ya aplicado".
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RENAMES: { from: string; to: string }[] = [
  // Capilar kits: "Tratamiento" -> "Kit Completo" (matches nouvie.co).
  { from: 'Tratamiento Revitalizante', to: 'Kit Completo Revitalizante' },
  { from: 'Tratamiento Reparación Intensa', to: 'Kit Completo Reparación Intensa' },
  { from: 'Tratamiento Suave y Liso', to: 'Kit Completo Liso y Sedoso' },
  // Individual products of that line: "Suave y Liso" -> "Liso y Sedoso".
  { from: 'Shampoo Suave y Liso (237 ml)', to: 'Shampoo Liso y Sedoso (237 ml)' },
  { from: 'Mascarilla Suave y Liso (177 ml)', to: 'Mascarilla Liso y Sedoso (177 ml)' },
  { from: 'Loción Suave y Liso (177 ml)', to: 'Loción Liso y Sedoso (177 ml)' },
]

async function main() {
  const commit = process.argv.includes('--commit')

  console.log('='.repeat(64))
  console.log(`RENOMBRAR KITS CAPILAR ${commit ? '(APLICANDO)' : '(DRY RUN)'}`)
  console.log('='.repeat(64))

  for (const { from, to } of RENAMES) {
    const current = await prisma.product.findFirst({ where: { name: from } })

    if (current) {
      console.log(`  "${from}"  ->  "${to}"`)
      if (commit) {
        await prisma.product.update({ where: { id: current.id }, data: { name: to } })
      }
      continue
    }

    // Not found under the old name — check whether it's already renamed.
    const already = await prisma.product.findFirst({ where: { name: to } })
    if (already) {
      console.log(`  "${to}"  (ya aplicado, sin cambios)`)
    } else {
      console.log(`  ⚠️  NO ENCONTRADO: "${from}"`)
    }
  }

  console.log(
    commit
      ? '\nListo. Nombres actualizados.'
      : '\nDRY RUN — no se escribió nada. Ejecuta con --commit para aplicar.'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
