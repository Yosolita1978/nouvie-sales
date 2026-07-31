import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatCOP } from '@/lib/utils'
import { MappingIndex, resolveItem } from '@/lib/historic-mapping'
import { normalizeName } from '@/lib/historic-clients'

// ============================================
// Reports built from the isolated historic_sales tables (read-only).
// The whole dataset is small (~357 sales), so we load it once and compute
// every report in plain TS — simplest and easiest to read.
// ============================================

type Sale = Prisma.HistoricSaleGetPayload<{ include: { items: true } }>

const DORMANT_MONTHS = 6

// Above this, an amount is almost certainly a data-entry typo (e.g. $152.000.000
// instead of $152.000). Such rows are excluded from money totals/rankings and
// listed separately for review, so a couple of typos can't distort the reports.
const AMOUNT_CAP = 5_000_000

/** Amount to use in money aggregates: 0 for suspect (over-cap) rows. */
function amountOf(s: Sale): number {
  const a = Number(s.amount)
  return a > AMOUNT_CAP ? 0 : a
}

/** Group clients by a normalized name (the sheet has spelling/spacing variants). */
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}

// --- Report computations -----------------------------------------------------

interface YearSummary {
  year: number
  count: number
  total: number
}

function yearSummaries(sales: Sale[]): YearSummary[] {
  const map = new Map<number, YearSummary>()
  for (const s of sales) {
    const y = map.get(s.year) ?? { year: s.year, count: 0, total: 0 }
    y.count += 1
    y.total += amountOf(s)
    map.set(s.year, y)
  }
  return [...map.values()].sort((a, b) => a.year - b.year)
}

interface ProductCount {
  name: string
  quantity: number
}

interface ProductsForYear {
  year: number
  best: ProductCount[]
  worst: ProductCount[]
}

function productsByYear(sales: Sale[], index: MappingIndex): ProductsForYear[] {
  const perYear = new Map<number, Map<string, number>>()
  for (const s of sales) {
    for (const it of s.items) {
      // One item can expand into several products (a promo box / kit).
      const { units } = resolveItem(it, s.rowNumber, index)
      if (units.length === 0) continue // ignored, or still unclassified
      const yearMap = perYear.get(s.year) ?? new Map<string, number>()
      for (const u of units) {
        yearMap.set(u.productName, (yearMap.get(u.productName) ?? 0) + u.quantity)
      }
      perYear.set(s.year, yearMap)
    }
  }

  const result: ProductsForYear[] = []
  for (const [year, yearMap] of perYear) {
    const ranked = [...yearMap.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
    result.push({
      year,
      best: ranked.slice(0, 5),
      worst: ranked.slice(-3).reverse(),
    })
  }
  return result.sort((a, b) => a.year - b.year)
}

interface ClientYear {
  year: number
  clients: { name: string; total: number; count: number }[]
}

function topClientsByYear(sales: Sale[]): ClientYear[] {
  const perYear = new Map<number, Map<string, { name: string; total: number; count: number }>>()
  for (const s of sales) {
    const key = normName(s.clientName)
    const yearMap = perYear.get(s.year) ?? new Map<string, { name: string; total: number; count: number }>()
    const c = yearMap.get(key) ?? { name: s.clientName, total: 0, count: 0 }
    c.total += amountOf(s)
    c.count += 1
    yearMap.set(key, c)
    perYear.set(s.year, yearMap)
  }

  const result: ClientYear[] = []
  for (const [year, yearMap] of perYear) {
    const clients = [...yearMap.values()].sort((a, b) => b.total - a.total).slice(0, 10)
    result.push({ year, clients })
  }
  return result.sort((a, b) => a.year - b.year)
}

interface ClientHistory {
  name: string
  total: number
  count: number
  lastDate: Date
  /** Where the most recent purchase came from. */
  lastSource: 'historico' | 'plataforma'
  /** Set once the sheet name is linked to a real customer. */
  customerId: string | null
  platformCount: number
}

interface OrderLite {
  customerId: string
  total: number
  orderDate: Date
}

/**
 * One row per REAL client, not per spelling in the sheet.
 *
 * Two things happen here that the old version got wrong:
 *   1. Several sheet names can be the same person ("ULTRABAC LTDA" / "ULTRABAC",
 *      "Jaime Perilla" / "Jaime Alberto Perilla"). Rows are keyed by the matched
 *      customer, so those collapse into one client.
 *   2. Live orders count too. Someone who bought in the sheet in 2024 and
 *      ordered last month is NOT inactive, and the old version said they were.
 */
function clientHistories(
  sales: Sale[],
  matchByClientKey: Map<string, { customerId: string | null; customerName: string | null }>,
  ordersByCustomer: Map<string, OrderLite[]>
): ClientHistory[] {
  const map = new Map<string, ClientHistory>()

  for (const s of sales) {
    const match = matchByClientKey.get(normalizeName(s.clientName))
    // Key by customer when linked; otherwise fall back to the sheet name.
    const key = match?.customerId ?? `hoja:${normName(s.clientName)}`
    const c = map.get(key) ?? {
      name: match?.customerName ?? s.clientName,
      total: 0,
      count: 0,
      lastDate: s.saleDate,
      lastSource: 'historico' as const,
      customerId: match?.customerId ?? null,
      platformCount: 0,
    }
    c.total += amountOf(s)
    c.count += 1
    if (s.saleDate > c.lastDate) {
      c.lastDate = s.saleDate
      c.lastSource = 'historico'
    }
    map.set(key, c)
  }

  // Fold in the live orders of every linked customer.
  for (const c of map.values()) {
    if (c.customerId === null) continue
    for (const o of ordersByCustomer.get(c.customerId) ?? []) {
      c.total += o.total
      c.count += 1
      c.platformCount += 1
      if (o.orderDate > c.lastDate) {
        c.lastDate = o.orderDate
        c.lastSource = 'plataforma'
      }
    }
  }

  return [...map.values()]
}

// --- Small presentational helpers -------------------------------------------

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// --- Page --------------------------------------------------------------------

export default async function HistoricoPage() {
  const [sales, mappingRows, clientMatches, orders] = await Promise.all([
    prisma.historicSale.findMany({ include: { items: true } }),
    prisma.historicProductMapping.findMany({ include: { components: true } }),
    prisma.historicClientMatch.findMany({
      select: {
        clientKey: true,
        confirmed: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    }),
    // Live orders of every customer linked to the sheet, so "última compra"
    // reflects the platform too, not only the old file.
    prisma.order.findMany({ select: { customerId: true, total: true, orderDate: true } }),
  ])

  const matchByClientKey = new Map(
    clientMatches
      .filter((m) => m.confirmed)
      .map((m) => [
        m.clientKey,
        { customerId: m.customerId, customerName: m.customer?.name ?? null },
      ])
  )

  const ordersByCustomer = new Map<string, OrderLite[]>()
  for (const o of orders) {
    const list = ordersByCustomer.get(o.customerId) ?? []
    list.push({ customerId: o.customerId, total: Number(o.total), orderDate: o.orderDate })
    ordersByCustomer.set(o.customerId, list)
  }

  const index = new MappingIndex(mappingRows)

  // Client-matching coverage, for the link to the review screen.
  const totalClients = new Set(sales.map((s) => normalizeName(s.clientName))).size
  const matchedClients = clientMatches.filter((m) => m.confirmed).length

  const summaries = yearSummaries(sales)
  const products = productsByYear(sales, index)
  const clientsByYear = topClientsByYear(sales)
  const histories = clientHistories(sales, matchByClientKey, ordersByCustomer)
  const unlinkedInReport = histories.filter((c) => c.customerId === null).length

  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - DORMANT_MONTHS)

  const dormant = histories
    .filter((c) => c.lastDate < cutoff)
    .sort((a, b) => b.total - a.total)

  const oneTime = histories.filter((c) => c.count === 1).sort((a, b) => b.total - a.total)

  // Rows with an implausibly large amount (data-entry typos) — excluded from the
  // money reports above and surfaced here for correction.
  const suspect = sales
    .filter((s) => Number(s.amount) > AMOUNT_CAP)
    .sort((a, b) => Number(b.amount) - Number(a.amount))

  const totalItems = sales.reduce((n, s) => n + s.items.length, 0)
  const unmappedItems = sales.reduce(
    (n, s) =>
      n +
      s.items.filter((i) => resolveItem(i, s.rowNumber, index).status === 'sin-clasificar').length,
    0
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Histórico de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Análisis del archivo de ventas antiguo ({sales.length} ventas, {summaries[0]?.year}–
          {summaries[summaries.length - 1]?.year}). Datos aislados: no afecta clientes ni pedidos actuales.
        </p>
      </div>

      {/* Resumen por año */}
      <Card title="Resumen por año">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaries.map((y) => (
            <div key={y.year} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-2xl font-bold text-gray-900">{y.year}</p>
              <p className="text-sm text-gray-600 mt-1">{y.count} ventas</p>
              <p className="text-sm font-medium text-gray-800 mt-1">{formatCOP(y.total)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Mejor y peor producto por año */}
      <Card title="Mejor y peor producto por año" subtitle="Por unidades vendidas. Excluye ítems sin clasificar.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.year}>
              <p className="font-semibold text-gray-800 mb-2">{p.year}</p>
              <p className="text-xs uppercase tracking-wide text-green-700 font-medium">Más vendidos</p>
              <ul className="mt-1 mb-3 space-y-1">
                {p.best.map((b) => (
                  <li key={b.name} className="flex justify-between text-sm text-gray-700">
                    <span className="truncate pr-2">{b.name}</span>
                    <span className="font-medium tabular-nums">{b.quantity}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs uppercase tracking-wide text-red-700 font-medium">Menos vendidos</p>
              <ul className="mt-1 space-y-1">
                {p.worst.map((w) => (
                  <li key={w.name} className="flex justify-between text-sm text-gray-500">
                    <span className="truncate pr-2">{w.name}</span>
                    <span className="tabular-nums">{w.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* Mejores clientes por año */}
      <Card title="Mejores clientes por año" subtitle="Top 10 por monto comprado.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {clientsByYear.map((cy) => (
            <div key={cy.year}>
              <p className="font-semibold text-gray-800 mb-2">{cy.year}</p>
              <ol className="space-y-1">
                {cy.clients.map((c, i) => (
                  <li key={c.name + i} className="flex justify-between text-sm text-gray-700">
                    <span className="truncate pr-2">
                      {i + 1}. {c.name}
                    </span>
                    <span className="font-medium tabular-nums whitespace-nowrap">{formatCOP(c.total)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Card>

      {/* Clientes inactivos +6 meses */}
      <Card
        title={`Clientes inactivos (+${DORMANT_MONTHS} meses)`}
        subtitle={
          `${dormant.length} clientes sin comprar desde antes de ${formatDate(cutoff)}. ` +
          `Cuenta el histórico Y los pedidos de la plataforma, y une las distintas ` +
          `grafías del mismo cliente. Ordenados por valor total (prioridad de contacto).`
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-medium">Cliente</th>
                <th className="py-2 pr-4 font-medium">Última compra</th>
                <th className="py-2 pr-4 font-medium">Origen</th>
                <th className="py-2 pr-4 font-medium text-right">Compras</th>
                <th className="py-2 font-medium text-right">Total gastado</th>
              </tr>
            </thead>
            <tbody>
              {dormant.slice(0, 40).map((c, i) => (
                <tr key={(c.customerId ?? c.name) + i} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-800">
                    {c.customerId ? (
                      <Link href={`/customers/${c.customerId}`} className="text-nouvie-blue hover:underline">
                        {c.name}
                      </Link>
                    ) : (
                      <span title="Sin vincular a un cliente de la plataforma">{c.name} ⚠️</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{formatDate(c.lastDate)}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">
                    {c.lastSource === 'plataforma' ? 'Plataforma' : 'Histórico'}
                    {c.platformCount > 0 && ` · ${c.platformCount} pedido${c.platformCount === 1 ? '' : 's'}`}
                  </td>
                  <td className="py-2 pr-4 text-gray-600 text-right tabular-nums">{c.count}</td>
                  <td className="py-2 text-gray-800 text-right font-medium tabular-nums">{formatCOP(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dormant.length > 40 && (
            <p className="text-xs text-gray-400 mt-2">Mostrando los 40 de mayor valor de {dormant.length}.</p>
          )}
          {unlinkedInReport > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ {unlinkedInReport} clientes del histórico no están vinculados a la plataforma, así
              que sus pedidos recientes no se tienen en cuenta.{' '}
              <Link href="/historico/clientes" className="underline">
                Revisar
              </Link>
            </p>
          )}
        </div>
      </Card>

      {/* Clientes de una sola compra */}
      <Card
        title="Clientes de una sola compra"
        subtitle={`${oneTime.length} clientes compraron una sola vez.`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {oneTime.slice(0, 40).map((c, i) => (
            <div key={c.name + i} className="flex justify-between text-sm text-gray-700">
              <span className="truncate pr-2">{c.name}</span>
              <span className="text-gray-500 tabular-nums whitespace-nowrap">
                {formatDate(c.lastDate)} · {formatCOP(c.total)}
              </span>
            </div>
          ))}
        </div>
        {oneTime.length > 40 && (
          <p className="text-xs text-gray-400 mt-2">Mostrando 40 de {oneTime.length}.</p>
        )}
      </Card>

      {/* Montos a revisar */}
      {suspect.length > 0 && (
        <Card
          title="⚠️ Montos a revisar"
          subtitle="Montos improbables (posibles errores de digitación). No se cuentan en los totales ni rankings de arriba."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-4 font-medium">Línea</th>
                  <th className="py-2 pr-4 font-medium">Cliente</th>
                  <th className="py-2 pr-4 font-medium">Pedido</th>
                  <th className="py-2 font-medium text-right">Monto registrado</th>
                </tr>
              </thead>
              <tbody>
                {suspect.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 tabular-nums">{s.rowNumber}</td>
                    <td className="py-2 pr-4 text-gray-800">{s.clientName}</td>
                    <td className="py-2 pr-4 text-gray-600 truncate max-w-xs">{s.rawProduct}</td>
                    <td className="py-2 text-right text-red-700 font-medium tabular-nums">
                      {formatCOP(Number(s.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Coverage note */}
      <p className="text-xs text-gray-400">
        Cobertura de productos: {totalItems - unmappedItems} de {totalItems} ítems clasificados (
        {Math.round(((totalItems - unmappedItems) / totalItems) * 100)}%). {unmappedItems} ítems sin
        clasificar no aparecen en el ranking de productos.{' '}
        <Link href="/historico/mapeo" className="text-nouvie-blue hover:underline">
          Gestionar sin clasificar →
        </Link>
      </p>

      <p className="text-xs text-gray-400">
        Clientes: {matchedClients} de {totalClients} vinculados con la plataforma.{' '}
        <Link href="/historico/clientes" className="text-nouvie-blue hover:underline">
          Revisar clientes →
        </Link>
      </p>
    </div>
  )
}
