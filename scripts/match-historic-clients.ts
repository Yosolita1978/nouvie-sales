/**
 * Link every client in the historic sheet to a real customer.
 *
 * Dry run (shows exactly what it would do, writes NOTHING):
 *   npx tsx scripts/match-historic-clients.ts
 *
 * Apply the safe part — exact matches only (cédula / email / teléfono / nombre
 * idéntico). Creates nothing:
 *   npx tsx scripts/match-historic-clients.ts --commit
 *
 * Also CREATE a customer for each historic client that matched nothing.
 * This is the only script that writes to the live customers table; every record
 * it creates is marked origin = "historico" so it can be found and undone:
 *   npx tsx scripts/match-historic-clients.ts --commit --create-missing
 *
 * Idempotent: matches are upserted by clientKey, and a client that already has
 * a customer is never created twice.
 */

import { PrismaClient } from '@prisma/client'
import {
  CustomerIndex,
  normalizeName,
  isExactName,
  onlyDigits,
  type HistoricClientLike,
} from '../lib/historic-clients'

const prisma = new PrismaClient()

interface HistoricClient {
  clientKey: string
  clientName: string
  sales: (HistoricClientLike & { city: string | null; address: string | null })[]
  saleCount: number
}

async function main() {
  const commit = process.argv.includes('--commit')
  const createMissing = process.argv.includes('--create-missing')

  const [sales, customers, existing] = await Promise.all([
    prisma.historicSale.findMany({
      select: {
        clientName: true, cedula: true, email: true, phone: true, city: true, address: true,
      },
    }),
    prisma.customer.findMany({
      select: { id: true, name: true, cedula: true, email: true, phone: true },
    }),
    prisma.historicClientMatch.findMany(),
  ])

  // Group the sheet's rows into one entry per client.
  const clients = new Map<string, HistoricClient>()
  for (const s of sales) {
    const clientKey = normalizeName(s.clientName)
    if (clientKey === '') continue
    const c = clients.get(clientKey) ?? {
      clientKey, clientName: s.clientName, sales: [], saleCount: 0,
    }
    c.sales.push(s)
    c.saleCount += 1
    clients.set(clientKey, c)
  }

  const index = new CustomerIndex(customers)
  const alreadyDone = new Set(existing.filter((e) => e.confirmed).map((e) => e.clientKey))
  const takenCustomerIds = new Set(
    existing.filter((e) => e.customerId).map((e) => e.customerId as string)
  )

  const exact: { client: HistoricClient; customerName: string; customerId: string; method: string }[] = []
  const suggestions: { client: HistoricClient; options: { name: string; score: number }[] }[] = []
  const orphans: HistoricClient[] = []

  for (const client of clients.values()) {
    if (alreadyDone.has(client.clientKey)) continue

    let match = index.findExact(client.sales)

    // An identical name is as safe as an exact field match.
    if (!match) {
      const same = customers.find((c) => isExactName(c.name, client.clientName))
      if (same) match = { customer: same, method: 'nombre', automatic: true, score: 1 }
    }

    // Never link two historic clients to the same customer.
    if (match && takenCustomerIds.has(match.customer.id)) match = null

    if (match) {
      takenCustomerIds.add(match.customer.id)
      exact.push({
        client, customerName: match.customer.name,
        customerId: match.customer.id, method: match.method,
      })
      continue
    }

    const options = index
      .suggestByName(client.clientName)
      .filter((o) => !takenCustomerIds.has(o.customer.id))
    if (options.length > 0) {
      suggestions.push({
        client, options: options.map((o) => ({ name: o.customer.name, score: o.score })),
      })
    } else {
      orphans.push(client)
    }
  }

  // --- Report -----------------------------------------------------------------
  console.log('='.repeat(72))
  console.log(`CLIENTES DEL HISTÓRICO ${commit ? '(APLICANDO)' : '(DRY RUN)'}`)
  console.log('='.repeat(72))
  console.log(`Clientes en la hoja: ${clients.size}`)
  console.log(`Clientes en la plataforma: ${customers.length}`)
  console.log(`Ya resueltos antes: ${alreadyDone.size}`)
  console.log()
  console.log(`  Coinciden exacto (automático):     ${exact.length}`)
  console.log(`  Sugerencias por nombre (revisar):  ${suggestions.length}`)
  console.log(`  Sin ningún parecido:               ${orphans.length}`)

  const byMethod = new Map<string, number>()
  exact.forEach((e) => byMethod.set(e.method, (byMethod.get(e.method) ?? 0) + 1))
  console.log(`\n  Detalle de los exactos:`)
  for (const [m, n] of byMethod) console.log(`     ${m.padEnd(10)} ${n}`)

  console.log(`\n--- Sugerencias que necesitan tu confirmación (${suggestions.length}) ---`)
  for (const s of suggestions.slice(0, 20)) {
    console.log(`\n  "${s.client.clientName}" (${s.client.saleCount} ventas)`)
    s.options.forEach((o) => console.log(`      ${Math.round(o.score * 100)}%  ${o.name}`))
  }
  if (suggestions.length > 20) console.log(`\n  ... y ${suggestions.length - 20} más`)

  console.log(`\n--- Sin parecido: se crearían como clientes nuevos (${orphans.length}) ---`)
  orphans.slice(0, 15).forEach((o) =>
    console.log(`  ${o.clientName} (${o.saleCount} ventas)`)
  )
  if (orphans.length > 15) console.log(`  ... y ${orphans.length - 15} más`)

  if (!commit) {
    console.log('\nDRY RUN — no se escribió nada.')
    console.log('  --commit                  aplica solo las coincidencias exactas')
    console.log('  --commit --create-missing además crea los clientes que no existen')
    return
  }

  // --- Write ------------------------------------------------------------------
  for (const e of exact) {
    await prisma.historicClientMatch.upsert({
      where: { clientKey: e.client.clientKey },
      create: {
        clientKey: e.client.clientKey, clientName: e.client.clientName,
        customerId: e.customerId, matchedBy: e.method, confirmed: true,
      },
      update: { customerId: e.customerId, matchedBy: e.method, confirmed: true },
    })
  }
  console.log(`\nVinculados ${exact.length} clientes existentes.`)

  // Suggestions are stored UNCONFIRMED so the review page can show them.
  for (const s of suggestions) {
    await prisma.historicClientMatch.upsert({
      where: { clientKey: s.client.clientKey },
      create: {
        clientKey: s.client.clientKey, clientName: s.client.clientName,
        customerId: null, matchedBy: 'nombre', confirmed: false,
      },
      update: {},
    })
  }
  console.log(`Guardadas ${suggestions.length} sugerencias para revisar.`)

  if (!createMissing) {
    console.log('\nNo se creó ningún cliente (falta --create-missing).')
    return
  }

  let created = 0
  for (const o of orphans) {
    // Best non-empty value across that client's rows.
    const pick = (f: 'cedula' | 'email' | 'phone' | 'city' | 'address') =>
      o.sales.map((s) => s[f]).find((v) => v !== null && v !== '') ?? null

    const cedulaRaw = pick('cedula')
    const cedula = cedulaRaw && onlyDigits(cedulaRaw).length >= 5 ? onlyDigits(cedulaRaw) : null
    // cedula is UNIQUE: skip it rather than collide with an existing customer.
    const cedulaFree =
      cedula && !(await prisma.customer.findUnique({ where: { cedula } })) ? cedula : null

    const customer = await prisma.customer.create({
      data: {
        name: o.clientName,
        cedula: cedulaFree,
        email: pick('email'),
        phone: pick('phone') ?? '', // required column; the sheet often has none
        city: pick('city'),
        address: pick('address'),
        origin: 'historico',
      },
    })
    await prisma.historicClientMatch.upsert({
      where: { clientKey: o.clientKey },
      create: {
        clientKey: o.clientKey, clientName: o.clientName,
        customerId: customer.id, matchedBy: 'creado', confirmed: true,
      },
      update: { customerId: customer.id, matchedBy: 'creado', confirmed: true },
    })
    created += 1
  }
  console.log(`Creados ${created} clientes nuevos (origin = "historico").`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
