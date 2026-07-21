import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MapeoTable } from './MapeoTable'

// ============================================
// Overmap page: assign a canonical product to each "UNMAPPED" historic item.
// Saves to historic_product_mappings; the reports page applies it live.
// ============================================

export default async function MapeoPage() {
  const [grouped, mappings, historicNames, dbProducts] = await Promise.all([
    prisma.historicSaleItem.groupBy({
      by: ['productName'],
      where: { productName: { startsWith: 'UNMAPPED:' } },
      _count: { _all: true },
      _sum: { quantity: true },
      orderBy: { _count: { productName: 'desc' } },
    }),
    prisma.historicProductMapping.findMany(),
    prisma.historicSaleItem.findMany({ distinct: ['productName'], select: { productName: true } }),
    prisma.product.findMany({ where: { active: true }, select: { name: true } }),
  ])

  const currentByName = new Map(mappings.map((m) => [m.unmappedName, m.productName]))

  const rows = grouped.map((g) => ({
    unmappedName: g.productName,
    count: g._count._all,
    quantity: g._sum.quantity ?? 0,
    current: currentByName.get(g.productName) ?? '',
  }))

  // Valid targets = products already recognized in the historic data + live catalog.
  const productOptions = [
    ...new Set([
      ...historicNames.map((h) => h.productName).filter((n) => !n.startsWith('UNMAPPED:')),
      ...dbProducts.map((p) => p.name),
    ]),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/historico" className="text-sm text-nouvie-blue hover:underline">
          ← Volver al histórico
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Productos sin clasificar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Asigna un producto a cada texto que no se pudo reconocer automáticamente. Al guardar, el
          ítem entra al ranking de productos del histórico. Para quitar una asignación, borra el
          campo y guarda.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow p-4 sm:p-6">
        <MapeoTable rows={rows} productOptions={productOptions} />
      </section>
    </div>
  )
}
