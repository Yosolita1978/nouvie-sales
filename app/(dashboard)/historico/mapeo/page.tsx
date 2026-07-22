import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { MapeoTable } from './MapeoTable'

// ============================================
// Overmap page: assign a canonical product to each "UNMAPPED" historic item.
// Saves to historic_product_mappings; the reports page applies it live.
// ============================================

// Catalog categories that are actual customer products (exclude packaging,
// labels and merchandising, which no historic sale would map to).
const RETAIL_CATEGORIES = ['Hogar', 'Capilar', 'Productos', 'Institucional', 'Ordeño']

export default async function MapeoPage() {
  const [unmappedItems, mappings, historicNames, dbProducts] = await Promise.all([
    // Every unmapped item, with the original order text it came from (for context).
    prisma.historicSaleItem.findMany({
      where: { productName: { startsWith: 'UNMAPPED:' } },
      include: { historicSale: { select: { rowNumber: true, rawProduct: true } } },
    }),
    prisma.historicProductMapping.findMany(),
    // Canonical names already recognized in the historic data.
    prisma.historicSaleItem.findMany({ distinct: ['productName'], select: { productName: true } }),
    // Real products from the live catalog (retail categories only).
    prisma.product.findMany({
      where: { active: true, category: { in: RETAIL_CATEGORIES } },
      select: { name: true },
    }),
  ])

  const currentByName = new Map(mappings.map((m) => [m.unmappedName, m.productName]))

  // Group unmapped items by their stored name; keep count, quantity and one example.
  const groups = new Map<
    string,
    { count: number; quantity: number; exampleText: string; exampleLine: number }
  >()
  for (const it of unmappedItems) {
    const g = groups.get(it.productName) ?? {
      count: 0,
      quantity: 0,
      exampleText: it.historicSale.rawProduct,
      exampleLine: it.historicSale.rowNumber,
    }
    g.count += 1
    g.quantity += it.quantity
    groups.set(it.productName, g)
  }

  const rows = [...groups.entries()]
    .map(([unmappedName, g]) => ({
      unmappedName,
      count: g.count,
      quantity: g.quantity,
      current: currentByName.get(unmappedName) ?? '',
      exampleText: g.exampleText,
      exampleLine: g.exampleLine,
    }))
    .sort((a, b) => b.count - a.count)

  // Valid targets = catalog products + names already used in the historic report.
  const productOptions = [
    ...new Set([
      ...historicNames.map((h) => h.productName).filter((n) => !n.startsWith('UNMAPPED:')),
      ...dbProducts.map((p) => p.name),
    ]),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/historico" className="text-sm text-nouvie-blue hover:underline">
          ← Volver al histórico
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Productos sin clasificar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cada fila muestra un texto que no se pudo reconocer y un ejemplo del pedido original donde
          aparece. Elige el producto correcto en la lista. Al guardar, el ítem entra al ranking de
          productos del histórico. Para quitar una asignación, elige “— Sin asignar —” y guarda.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow p-4 sm:p-6">
        <MapeoTable rows={rows} productOptions={productOptions} />
      </section>
    </div>
  )
}
