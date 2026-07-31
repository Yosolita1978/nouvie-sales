import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { GLOBAL_ROW, MappingIndex, resolveItem } from '@/lib/historic-mapping'
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
    prisma.historicProductMapping.findMany({ include: { components: true } }),
    // Canonical names already recognized in the historic data.
    prisma.historicSaleItem.findMany({ distinct: ['productName'], select: { productName: true } }),
    // Real products from the live catalog (retail categories only).
    prisma.product.findMany({
      where: { active: true, category: { in: RETAIL_CATEGORIES } },
      select: { name: true },
    }),
  ])

  const index = new MappingIndex(mappings)

  // Only items that STILL have no rule. Anything already resolved (a product, a
  // kit, or explicitly ignored) must not be listed as pending work.
  const pending = unmappedItems.filter(
    (it) =>
      resolveItem(it, it.historicSale.rowNumber, index).status === 'sin-clasificar'
  )

  // Group by text AND line: the same word can mean different things on
  // different orders, so each is resolved on its own line.
  const groups = new Map<
    string,
    { unmappedName: string; rowNumber: number; count: number; quantity: number; exampleText: string }
  >()
  for (const it of pending) {
    const rowNumber = it.historicSale.rowNumber
    const key = `${it.productName} ${rowNumber}`
    const g = groups.get(key) ?? {
      unmappedName: it.productName,
      rowNumber,
      count: 0,
      quantity: 0,
      exampleText: it.historicSale.rawProduct,
    }
    g.count += 1
    g.quantity += it.quantity
    groups.set(key, g)
  }

  const rows = [...groups.values()]
    .map((g) => ({
      unmappedName: g.unmappedName,
      rowNumber: g.rowNumber,
      count: g.count,
      quantity: g.quantity,
      current: '',
      exampleText: g.exampleText,
      exampleLine: g.rowNumber,
    }))
    .sort((a, b) => b.quantity - a.quantity || a.rowNumber - b.rowNumber)

  // Rules already saved, shown below the pending table so the client can see
  // (and undo) what has been decided.
  const savedRules = mappings
    .map((m) => ({
      unmappedName: m.unmappedName,
      rowNumber: m.rowNumber,
      description: m.ignored
        ? 'No se cuenta (no es un producto)'
        : m.components.map((c) => `${c.quantity}x ${c.productName}`).join(' + '),
    }))
    .sort((a, b) => a.rowNumber - b.rowNumber || a.unmappedName.localeCompare(b.unmappedName, 'es'))

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
          Cada fila es un texto del pedido original que no se pudo reconocer, con la línea donde
          aparece. Elige el producto correcto, o marca “No es producto” si es el nombre de una
          promoción y sus productos ya están contados aparte. Cada decisión se guarda solo para esa
          línea. Para deshacerla, borra el texto y guarda.
        </p>
      </div>

      <section className="bg-white rounded-lg shadow p-4 sm:p-6">
        <MapeoTable rows={rows} productOptions={productOptions} />
      </section>

      <section className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Ya resueltos ({savedRules.length})
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Decisiones guardadas. “Todas” significa que la regla aplica a cualquier línea.
        </p>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4 font-medium">Texto</th>
              <th className="py-2 pr-4 font-medium">Línea</th>
              <th className="py-2 font-medium">Se cuenta como</th>
            </tr>
          </thead>
          <tbody>
            {savedRules.map((r) => (
              <tr key={`${r.unmappedName}-${r.rowNumber}`} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-800">
                  {r.unmappedName.replace('UNMAPPED: ', '')}
                </td>
                <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                  {r.rowNumber === GLOBAL_ROW ? 'Todas' : r.rowNumber}
                </td>
                <td className="py-2 text-gray-600">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
