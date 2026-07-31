/**
 * Find customers that look like the same person recorded twice.
 *
 * REPORT ONLY — this script never writes anything. For each suspected pair it
 * prints both records side by side and the exact merge command, so every merge
 * stays a deliberate decision:
 *
 *   npx tsx scripts/find-duplicate-customers.ts
 *   npx tsx scripts/find-duplicate-customers.ts --min 0.9   (solo los más seguros)
 *
 * Why this exists: the customers table was built from three sources — the
 * platform, the 2024-2026 sales sheet, and the June 2026 phone campaign — so the
 * same person can appear more than once with different spellings
 * ("JAIME ALBERTO PERILLA GOMEZ" / "JAIME ALBERTO PERILLA SANCLEMENTE").
 *
 * Evidence used, strongest first: same real phone, same real email, very similar
 * name, same address. Two values are DELIBERATELY ignored as evidence because
 * they are shared placeholders across hundreds of records:
 *   - phone 3158326422
 *   - email nouvie.colombia@gmail.com
 */

import { PrismaClient } from '@prisma/client'
import { nameSimilarity, phoneKey, emailKey, normalizeName } from '../lib/historic-clients'

const prisma = new PrismaClient()

// Filler values that appear on hundreds of customers: never proof of identity.
const PLACEHOLDER_PHONES = new Set([phoneKey('3158326422')])
const PLACEHOLDER_EMAILS = new Set(['nouvie.colombia@gmail.com'])

interface Row {
  id: string
  name: string
  cedula: string | null
  email: string | null
  phone: string
  address: string | null
  origin: string
  orderCount: number
  historicCount: number
  lastPurchase: Date | null
}

interface Suspect {
  a: Row
  b: Row
  score: number
  reasons: string[]
}

function realPhone(p: string): string {
  const k = phoneKey(p)
  return PLACEHOLDER_PHONES.has(k) ? '' : k
}

function realEmail(e: string | null): string {
  const k = emailKey(e)
  return k === '' || PLACEHOLDER_EMAILS.has(k) ? '' : k
}

function normAddress(a: string | null): string {
  return (a ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function fmt(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '—'
}

async function main() {
  const minArg = process.argv.indexOf('--min')
  const minScore = minArg === -1 ? 0.5 : Number(process.argv[minArg + 1] ?? 0.5)

  const [customers, matches, sales, orders] = await Promise.all([
    prisma.customer.findMany({
      select: {
        id: true, name: true, cedula: true, email: true, phone: true,
        address: true, origin: true,
      },
    }),
    prisma.historicClientMatch.findMany({
      where: { confirmed: true, customerId: { not: null } },
      select: { customerId: true, clientName: true },
    }),
    prisma.historicSale.findMany({ select: { clientName: true, saleDate: true } }),
    prisma.order.findMany({ select: { customerId: true, orderDate: true } }),
  ])

  // Purchases per customer, from both sources.
  const customerIdByClientName = new Map(matches.map((m) => [m.clientName, m.customerId as string]))
  const historicCount = new Map<string, number>()
  const lastPurchase = new Map<string, Date>()

  for (const s of sales) {
    const id = customerIdByClientName.get(s.clientName)
    if (!id) continue
    historicCount.set(id, (historicCount.get(id) ?? 0) + 1)
    const cur = lastPurchase.get(id)
    if (!cur || s.saleDate > cur) lastPurchase.set(id, s.saleDate)
  }
  const orderCount = new Map<string, number>()
  for (const o of orders) {
    orderCount.set(o.customerId, (orderCount.get(o.customerId) ?? 0) + 1)
    const cur = lastPurchase.get(o.customerId)
    if (!cur || o.orderDate > cur) lastPurchase.set(o.customerId, o.orderDate)
  }

  const rows: Row[] = customers.map((c) => ({
    ...c,
    orderCount: orderCount.get(c.id) ?? 0,
    historicCount: historicCount.get(c.id) ?? 0,
    lastPurchase: lastPurchase.get(c.id) ?? null,
  }))

  // --- Compare every pair -----------------------------------------------------
  const suspects: Suspect[] = []

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]
      const b = rows[j]

      const reasons: string[] = []
      let score = 0

      const samePhone = realPhone(a.phone) !== '' && realPhone(a.phone) === realPhone(b.phone)
      const sameEmail = realEmail(a.email) !== '' && realEmail(a.email) === realEmail(b.email)
      const sameAddress =
        normAddress(a.address).length > 8 && normAddress(a.address) === normAddress(b.address)
      const nameScore = nameSimilarity(a.name, b.name)
      const sameName = normalizeName(a.name) === normalizeName(b.name)

      if (samePhone) { score += 0.5; reasons.push('mismo teléfono') }
      if (sameEmail) { score += 0.5; reasons.push('mismo email') }
      if (sameName) { score += 0.7; reasons.push('nombre idéntico') }
      // 0.6 catches "PERILLA GOMEZ" vs "PERILLA SANCLEMENTE" (3 of 4 words),
      // which a 0.8 threshold missed even though it was a real duplicate.
      else if (nameScore >= 0.6) { score += nameScore * 0.6; reasons.push(`nombre ${Math.round(nameScore * 100)}%`) }
      if (sameAddress) { score += 0.25; reasons.push('misma dirección') }

      // Names that share almost nothing are not duplicates, whatever else matches.
      if (nameScore < 0.5 && !sameName) continue
      if (score < minScore) continue

      // Both having a cédula, and different ones, is a reason for caution — not
      // a disqualifier: the Perilla case had two cédulas and was one person.
      if (a.cedula && b.cedula && a.cedula !== b.cedula) {
        reasons.push('⚠️ cédulas distintas')
      }

      suspects.push({ a, b, score: Math.min(score, 1), reasons })
    }
  }

  suspects.sort((x, y) => y.score - x.score)

  console.log('='.repeat(78))
  console.log('POSIBLES CLIENTES DUPLICADOS  (solo informe, no escribe nada)')
  console.log('='.repeat(78))
  console.log(`Clientes revisados: ${rows.length}`)
  console.log(`Parejas sospechosas: ${suspects.length}  (umbral ${minScore})\n`)

  suspects.forEach((s, i) => {
    // Suggest keeping the record with more purchases, then more real data.
    const value = (r: Row) =>
      r.orderCount * 10 + r.historicCount * 5 +
      (r.cedula ? 2 : 0) + (realPhone(r.phone) ? 1 : 0) + (realEmail(r.email) ? 1 : 0)
    const [keep, drop] = value(s.a) >= value(s.b) ? [s.a, s.b] : [s.b, s.a]

    console.log(`${'-'.repeat(78)}`)
    console.log(`${i + 1}. confianza ${Math.round(s.score * 100)}%  ·  ${s.reasons.join(' · ')}`)
    for (const [label, r] of [['CONSERVAR', keep], ['ELIMINAR ', drop]] as const) {
      console.log(`   ${label}  ${r.name}`)
      console.log(`             cédula ${r.cedula ?? '—'} | tel ${r.phone || '—'} | ${r.email ?? '—'}`)
      console.log(`             ${r.orderCount} pedidos + ${r.historicCount} históricas | última ${fmt(r.lastPurchase)} | origen ${r.origin}`)
    }
    console.log(`   >> npx tsx scripts/merge-customers.ts --keep ${keep.id} --remove ${drop.id}`)
  })

  if (suspects.length === 0) {
    console.log('No se encontraron duplicados con ese umbral. 🎉')
  } else {
    console.log(`\n${'='.repeat(78)}`)
    console.log('Revisa cada pareja antes de fusionar. Los comandos son DRY RUN:')
    console.log('añade --commit solo cuando estés segura. Fusionar NO se puede deshacer.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
