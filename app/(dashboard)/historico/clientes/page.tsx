import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatCOP } from '@/lib/utils'
import { CustomerIndex, normalizeName } from '@/lib/historic-clients'
import { ClientesTable } from './ClientesTable'

// ============================================
// Review screen: decide which real customer each client of the old sheet is.
// Exact matches (cédula / email / teléfono / nombre idéntico) are already
// resolved by scripts/match-historic-clients.ts. What is left needs a person,
// because a wrong merge would credit a purchase to someone who never made it.
// ============================================

export default async function ClientesHistoricoPage() {
  const [sales, customers, matches] = await Promise.all([
    prisma.historicSale.findMany({
      select: { clientName: true, cedula: true, email: true, phone: true, year: true, saleDate: true, amount: true },
    }),
    prisma.customer.findMany({
      select: { id: true, name: true, cedula: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    }),
    prisma.historicClientMatch.findMany(),
  ])

  const matchByKey = new Map(matches.map((m) => [m.clientKey, m]))

  // One entry per client of the sheet.
  interface Grouped {
    clientKey: string
    clientName: string
    saleCount: number
    total: number
    years: number[]
    lastDate: Date
    cedula: string | null
    phone: string | null
  }
  const grouped = new Map<string, Grouped>()
  for (const s of sales) {
    const clientKey = normalizeName(s.clientName)
    if (clientKey === '') continue
    const g = grouped.get(clientKey) ?? {
      clientKey,
      clientName: s.clientName,
      saleCount: 0,
      total: 0,
      years: [],
      lastDate: s.saleDate,
      cedula: null,
      phone: null,
    }
    g.saleCount += 1
    g.total += Number(s.amount)
    if (!g.years.includes(s.year)) g.years.push(s.year)
    if (s.saleDate > g.lastDate) g.lastDate = s.saleDate
    g.cedula = g.cedula ?? s.cedula
    g.phone = g.phone ?? s.phone
    grouped.set(clientKey, g)
  }

  // Which historic name(s) already point at each customer. NOT a blocker: the
  // sheet spells the same person several ways and all of them should link to
  // the same customer. Shown as a hint so the choice is informed.
  const linkedTo = new Map<string, string>()
  for (const m of matches) {
    if (m.customerId) linkedTo.set(m.customerId, m.clientName)
  }
  const index = new CustomerIndex(customers)

  const pending = [...grouped.values()]
    .filter((g) => !matchByKey.get(g.clientKey)?.confirmed)
    .map((g) => ({
      clientKey: g.clientKey,
      clientName: g.clientName,
      saleCount: g.saleCount,
      total: formatCOP(g.total),
      years: g.years.sort((a, b) => a - b).join(', '),
      cedula: g.cedula,
      phone: g.phone,
      suggestions: index.suggestByName(g.clientName, 3).map((s) => ({
        id: s.customer.id,
        name: s.customer.name,
        cedula: s.customer.cedula,
        score: Math.round(s.score * 100),
        linkedTo: linkedTo.get(s.customer.id) ?? null,
      })),
    }))
    .sort((a, b) => b.saleCount - a.saleCount || a.clientName.localeCompare(b.clientName, 'es'))

  const resolved = [...grouped.values()].filter((g) => matchByKey.get(g.clientKey)?.confirmed).length

  // Every customer, for the free search box. Labelled with the cédula so two
  // people with the same name can be told apart.
  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.cedula ? `${c.name} · ${c.cedula}` : c.name,
    linkedTo: linkedTo.get(c.id) ?? null,
  }))

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/historico" className="text-sm text-nouvie-blue hover:underline">
          ← Volver al histórico
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Clientes del histórico</h1>
        <p className="text-sm text-gray-500 mt-1">
          La hoja antigua guarda nombres informales (“Jaime Perilla”) y la plataforma los nombres
          completos (“JAIME ALBERTO PERILLA GOMEZ”). Aquí decides quién es quién. Ya se resolvieron{' '}
          <strong>{resolved}</strong> automáticamente por cédula, correo o teléfono; faltan{' '}
          <strong>{pending.length}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Si la persona no existe en la plataforma, usa <strong>Crear cliente</strong>: se crea con
          los datos de la hoja y queda marcada como creada desde el histórico. Si el nombre no es un
          cliente real, usa <strong>Omitir</strong>.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow p-4 sm:p-6">
        <ClientesTable rows={pending} customerOptions={customerOptions} />
      </section>
    </div>
  )
}
