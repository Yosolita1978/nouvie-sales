/**
 * Merge two customer records that turned out to be the same person.
 *
 * Dry run (shows exactly what would move, writes NOTHING):
 *   npx tsx scripts/merge-customers.ts --keep <id|cédula> --remove <id|cédula>
 *
 * Apply:
 *   npx tsx scripts/merge-customers.ts --keep <...> --remove <...> --commit
 *
 * What it does, in one transaction:
 *   1. Moves every ORDER from the removed customer to the kept one.
 *   2. Moves every HISTORIC CLIENT MATCH, so the old sheet's purchases follow.
 *   3. Fills BLANK fields on the kept record from the removed one — it never
 *      overwrites data the kept record already has.
 *   4. Deletes the removed customer.
 *
 * Step 1 must happen before step 4: orders block deletion (onDelete: Restrict),
 * and historic matches would otherwise be silently unlinked (onDelete: SetNull).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function arg(name: string): string | null {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : (process.argv[i + 1] ?? null)
}

/** Accepts either a customer id or a cédula, whichever is easier to paste. */
async function findCustomer(ref: string) {
  return (
    (await prisma.customer.findUnique({ where: { id: ref } })) ??
    (await prisma.customer.findUnique({ where: { cedula: ref } }))
  )
}

async function main() {
  const commit = process.argv.includes('--commit')
  const keepRef = arg('--keep')
  const removeRef = arg('--remove')

  if (!keepRef || !removeRef) {
    console.error('Uso: --keep <id|cédula> --remove <id|cédula> [--commit]')
    process.exitCode = 1
    return
  }
  if (keepRef === removeRef) {
    console.error('El cliente a conservar y el que se elimina son el mismo.')
    process.exitCode = 1
    return
  }

  const keep = await findCustomer(keepRef)
  const remove = await findCustomer(removeRef)

  if (!keep) { console.error(`No existe el cliente a conservar: ${keepRef}`); process.exitCode = 1; return }
  if (!remove) { console.error(`No existe el cliente a eliminar: ${removeRef}`); process.exitCode = 1; return }
  if (keep.id === remove.id) { console.error('Ambas referencias apuntan al mismo cliente.'); process.exitCode = 1; return }

  const [keepOrders, removeOrders, keepMatches, removeMatches] = await Promise.all([
    prisma.order.count({ where: { customerId: keep.id } }),
    prisma.order.findMany({ where: { customerId: remove.id }, select: { orderNumber: true } }),
    prisma.historicClientMatch.count({ where: { customerId: keep.id } }),
    prisma.historicClientMatch.findMany({ where: { customerId: remove.id }, select: { clientName: true } }),
  ])

  console.log('='.repeat(70))
  console.log(`FUSIONAR CLIENTES ${commit ? '(APLICANDO)' : '(DRY RUN)'}`)
  console.log('='.repeat(70))
  console.log(`\nSE CONSERVA:  ${keep.name}`)
  console.log(`   id ${keep.id}`)
  console.log(`   cédula ${keep.cedula ?? '—'} | tel ${keep.phone || '—'} | email ${keep.email ?? '—'}`)
  console.log(`   origen ${keep.origin} | ${keepOrders} pedidos | ${keepMatches} nombres del histórico`)
  console.log(`\nSE ELIMINA:   ${remove.name}`)
  console.log(`   id ${remove.id}`)
  console.log(`   cédula ${remove.cedula ?? '—'} | tel ${remove.phone || '—'} | email ${remove.email ?? '—'}`)
  console.log(`   origen ${remove.origin} | ${removeOrders.length} pedidos | ${removeMatches.length} nombres del histórico`)

  // Only fill what the kept record is missing.
  const isBlank = (v: string | null) => v === null || v.trim() === ''
  const fill: Record<string, string | boolean | Date> = {}
  if (isBlank(keep.cedula) && !isBlank(remove.cedula)) fill.cedula = remove.cedula as string
  if (isBlank(keep.email) && !isBlank(remove.email)) fill.email = remove.email as string
  if (isBlank(keep.phone) && !isBlank(remove.phone)) fill.phone = remove.phone
  if (isBlank(keep.address) && !isBlank(remove.address)) fill.address = remove.address as string
  if (isBlank(keep.city) && !isBlank(remove.city)) fill.city = remove.city as string
  if (isBlank(keep.campaignNote) && !isBlank(remove.campaignNote)) fill.campaignNote = remove.campaignNote as string
  // Consent and contact date: keep the "strongest" value of the two.
  if (remove.acceptsMarketing && !keep.acceptsMarketing) fill.acceptsMarketing = true
  if (
    remove.lastContactedAt &&
    (!keep.lastContactedAt || remove.lastContactedAt > keep.lastContactedAt)
  ) {
    fill.lastContactedAt = remove.lastContactedAt
  }

  console.log(`\n--- Se mueven ---`)
  console.log(`  Pedidos: ${removeOrders.length}`)
  removeOrders.forEach((o) => console.log(`     ${o.orderNumber}`))
  console.log(`  Nombres del histórico: ${removeMatches.length}`)
  removeMatches.forEach((m) => console.log(`     "${m.clientName}"`))

  console.log(`\n--- Datos que se rellenan en el que se conserva ---`)
  if (Object.keys(fill).length === 0) {
    console.log('  (ninguno: el cliente conservado ya tiene todos esos datos)')
  } else {
    for (const [k, v] of Object.entries(fill)) console.log(`  ${k}: ${String(v)}`)
  }

  if (!commit) {
    console.log('\nDRY RUN — no se escribió nada. Añade --commit para aplicar.')
    return
  }

  await prisma.$transaction(async (tx) => {
    // 1. Orders first: they block the delete.
    await tx.order.updateMany({ where: { customerId: remove.id }, data: { customerId: keep.id } })
    // 2. Historic names, so the old purchases follow the surviving customer.
    await tx.historicClientMatch.updateMany({
      where: { customerId: remove.id },
      data: { customerId: keep.id },
    })
    // 3. Fill the gaps. cedula is UNIQUE, so free it on the old row first.
    if (fill.cedula) {
      await tx.customer.update({ where: { id: remove.id }, data: { cedula: null } })
    }
    if (Object.keys(fill).length > 0) {
      await tx.customer.update({ where: { id: keep.id }, data: fill })
    }
    // 4. Now it is safe to remove.
    await tx.customer.delete({ where: { id: remove.id } })
  })

  console.log(`\nListo. "${remove.name}" se fusionó en "${keep.name}".`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
