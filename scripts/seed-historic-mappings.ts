/**
 * Load the client's answers about the unclassified historic texts into
 * historic_product_mappings.
 *
 * Dry run (prints every rule + a unit check, writes NOTHING):
 *   npx tsx scripts/seed-historic-mappings.ts
 *
 * Apply:
 *   npx tsx scripts/seed-historic-mappings.ts --commit
 *
 * Idempotent: rules are upserted by (unmappedName, rowNumber), so re-running
 * never duplicates. Writes ONLY to the historic_* mapping tables.
 *
 * Source: the client's document "Arreglos Sistema admin" (jul 2026), where she
 * went through the unclassified rows one by one. Where she gave a unit total
 * ("son 6 unidades") it is recorded below as `expectUnits` and checked.
 *
 * IMPORTANT — how these rules were written: several of her notes name products
 * the parser ALREADY counts on that line. Expanding those would double count.
 * In those cases the leftover text is the promo's NAME, so the rule is `ignore`.
 */

import { PrismaClient } from '@prisma/client'
import { MappingIndex, resolveItem, GLOBAL_ROW } from '../lib/historic-mapping'

const prisma = new PrismaClient()

// --- Product shorthand -------------------------------------------------------
// A "kit capilar" is shampoo + mascarilla + loción of that line.

const LISO = 'Liso y Sedoso'
const REPA = 'Reparación Intensa'
const REVI = 'Revitalizante'

const kitCapilar = (linea: string) => [
  { productName: `Shampoo ${linea}`, quantity: 1 },
  { productName: `Mascarilla ${linea}`, quantity: 1 },
  { productName: `Loción ${linea}`, quantity: 1 },
]

// "kit men" / "kits hombre" = kit revitalizante = shampoo + loción (no mascarilla).
const kitRevitalizante = [
  { productName: `Shampoo ${REVI}`, quantity: 1 },
  { productName: `Loción ${REVI}`, quantity: 1 },
]

interface SeedRule {
  /** The text as stored, without the "UNMAPPED: " prefix. */
  text: string
  /** 0 = every line; a line number scopes the rule to that sale only. */
  rowNumber?: number
  ignored?: boolean
  /** false when the components are a flat total, not per unit. */
  multiplyByQuantity?: boolean
  components?: { productName: string; quantity: number }[]
  /** The client's own unit total for the whole sale, when she gave one. */
  expectUnits?: number
  why: string
}

const RULES: SeedRule[] = [
  // ---------------------------------------------------------------------------
  // KITS — the text is the only thing written, so it really does expand.
  // ---------------------------------------------------------------------------
  {
    text: 'cajas dia de la madre',
    rowNumber: 25,
    multiplyByQuantity: false, // "2 cajas ... son 6 unidades" = 6 in total, not 6 each
    components: [...kitCapilar(LISO), ...kitCapilar(REPA)],
    expectUnits: 6,
    why: '2 cajas de regalo: una con kit liso y sedoso, otra con kit reparación intensa.',
  },
  {
    text: 'kiwi',
    rowNumber: 25,
    ignored: true,
    why: '"1 kiwi 1 melon" describe cuáles son las 2 cajas; ya van dentro del kit.',
  },
  {
    text: 'melon',
    rowNumber: 25,
    ignored: true,
    why: 'Igual que arriba: describe la segunda caja, no es un producto extra.',
  },

  // "kit melon" = kit capilar reparación intensa. Aparece en varias líneas.
  {
    text: 'kit melon',
    components: kitCapilar(REPA),
    why: 'Kit melón = kit capilar reparación intensa (shampoo + mascarilla + loción).',
  },
  {
    text: 'kits melon',
    components: kitCapilar(REPA),
    expectUnits: 10, // línea 151: 3 kits (9) + 1 masque melón ya contado
    why: 'Plural del mismo kit; "3 kits melón" = 3 veces el kit.',
  },
  {
    text: 'kit melon mas',
    rowNumber: 220,
    components: kitCapilar(REPA),
    expectUnits: 4, // kit (3) + 1 molding melón ya contado
    why: 'Kit melón + 1 loción moldeadora reparación intensa (esa ya se cuenta aparte).',
  },
  {
    text: 'kit completo melon',
    rowNumber: 227,
    components: kitCapilar(REPA),
    expectUnits: 3,
    why: 'Kit completo melón = kit capilar reparación intensa.',
  },
  {
    text: 'kit reparacion intensa',
    rowNumber: 330,
    components: kitCapilar(REPA),
    expectUnits: 5, // kit (3) + desengrasante + limpiavidrios ya contados
    why: 'Kit capilar reparación intensa.',
  },
  {
    text: 'kits capilar honey melon',
    rowNumber: 302,
    components: kitCapilar(REPA),
    expectUnits: 12, // 4 kits x 3
    why: 'Honey melón = reparación intensiva; 4 kits completos.',
  },
  {
    text: 'kit capilar de kiwi ( )',
    rowNumber: 205,
    components: kitCapilar(LISO),
    expectUnits: 4, // kit (3) + 1 desengrasante ya contado
    why: 'Kiwi = liso y sedoso; kit capilar completo.',
  },
  {
    text: 'kit men',
    rowNumber: 150,
    components: kitRevitalizante,
    expectUnits: 6, // kit melón (3) + 1 molding melón ya contado + kit men (2)
    why: 'Kit men = kit revitalizante: shampoo + loción moldeadora.',
  },
  {
    text: 'kits hombre',
    components: kitRevitalizante,
    why: 'Kits hombre = kit revitalizante (shampoo + loción), por unidad.',
  },

  // ---------------------------------------------------------------------------
  // UN SOLO PRODUCTO — el texto sí es un producto, mal escrito.
  // ---------------------------------------------------------------------------
  {
    text: 'diisp',
    rowNumber: 53,
    components: [{ productName: 'Dosificador', quantity: 1 }],
    why: '"4 diisp" = 4 dosificadores.',
  },
  {
    text: 'sha hombre',
    rowNumber: 114,
    components: [{ productName: `Shampoo ${REVI}`, quantity: 1 }],
    expectUnits: 6,
    why: 'Shampoo hombre = shampoo revitalizante.',
  },
  {
    text: 'rosa',
    rowNumber: 146,
    components: [{ productName: 'Detergente Neutro', quantity: 1 }],
    expectUnits: 4,
    why: 'Rosa/rosado = detergente neutro.',
  },
  {
    text: 'rojos',
    rowNumber: 207,
    components: [{ productName: 'Detergente Neutro', quantity: 1 }],
    expectUnits: 10,
    why: 'La cliente aclaró: "Rojo: detergente neutro (rosado)".',
  },
  {
    text: 'desengr',
    rowNumber: 325,
    components: [{ productName: 'Desengrasante Multiusos', quantity: 1 }],
    expectUnits: 5,
    why: 'Abreviatura de desengrasante multiusos.',
  },

  // ---------------------------------------------------------------------------
  // RUIDO — nombre de la promoción o repetición de lo ya contado.
  // Contarlos inflaría las cifras.
  // ---------------------------------------------------------------------------
  {
    text: 'acai',
    rowNumber: 21,
    ignored: true,
    expectUnits: 3,
    why: 'Acai = liso y sedoso, pero shampoo/loción/mascarilla ya están contados en la línea.',
  },
  { text: 'los', rowNumber: 38, ignored: true, why: 'Resto de "y los 5 dispensadores".' },
  { text: 'capilar:', rowNumber: 230, ignored: true, expectUnits: 4, why: 'Nombre de la promoción.' },
  { text: 'nov', rowNumber: 207, ignored: true, why: 'Nombre de la promoción ("promocion NOV").' },
  { text: 'kit', rowNumber: 224, ignored: true, expectUnits: 3, why: '"kit prom" es el nombre; los productos están escritos.' },
  { text: 'kit inicio', rowNumber: 328, ignored: true, expectUnits: 9, why: 'El kit de inicio era un descuento, no un producto.' },
  { text: 'kit inicio:', rowNumber: 339, ignored: true, expectUnits: 10, why: 'Igual: descuento, y los productos están detallados.' },
  { text: 'kiwi', rowNumber: 228, ignored: true, why: '"2 shampoo: 1 kiwi y 1 melon" describe los 2 shampoo ya contados.' },
  { text: 'melon', rowNumber: 228, ignored: true, why: 'Igual que arriba.' },

  {
    text: 'kiwi',
    rowNumber: 142,
    ignored: true,
    why: 'Es el nombre del kit, no un producto aparte (confirmado jul 2026).',
  },
  {
    text: 'paga dos de kiwi',
    rowNumber: 219,
    components: [
      { productName: `Shampoo ${LISO}`, quantity: 2 },
      { productName: `Mascarilla ${LISO}`, quantity: 2 },
      { productName: `Loción ${LISO}`, quantity: 2 },
    ],
    expectUnits: 6,
    why: 'Confirmado: son dos kits kiwi = dos kits capilares liso y sedoso.',
  },
  {
    text: 'acero',
    rowNumber: 206,
    components: [{ productName: 'Limpia Vidrios Institucional Concentrado (1 l)', quantity: 1 }],
    why: 'Pedido institucional: "acero" es el Limpia Vidrios Institucional Concentrado (nouvie.co).',
  },
  {
    text: 'suavizantes',
    rowNumber: 341,
    ignored: true,
    why: 'Descartada: Ultrabac son litros preparados, no tarros; no se convierte.',
  },

  // Líneas que la cliente pidió descartar.
  { text: 'kit de 3 (contenido no especificado)', rowNumber: 4, ignored: true, why: 'Descartada: no se sabe qué contenía.' },
  { text: 'kit capilar melon', rowNumber: 327, ignored: true, why: 'Descartada por la cliente; el resto de la línea sí se cuenta.' },
  { text: 'kiwi', rowNumber: 327, ignored: true, why: 'Descartada por la cliente (kit viajero, ya no se vende).' },
]

// Unit totals the client gave for lines that a GLOBAL rule resolves (so the
// total can't hang off a single line-scoped rule). [line, units]
const EXTRA_CHECKS: [number, number][] = [
  [151, 10], // "3 kits melón 1 masque melon" -> 3x3 + 1
  [182, 7], //  "1 Kit melon 2 kits hombre"  -> 3 + 2x2
  [221, 3], //  "Promo kit melon"
  [78, 5], //   corregida en el importador: 2 amarillos 2 azules 1 blanco
  [145, 7], //  corregida en el importador: 3 amarillos + azul + rosado + kit revitalizante
  [171, 6], //  corregida en el importador: 3 amarillos 3 rosados
  [245, 5], //  corregida en el importador: 4 azules 1 rosado
]

// Texts left ON PURPOSE without a rule — they need the client to answer.
const PENDING: { line: number; text: string; question: string }[] = [
  {
    line: 206,
    text: 'botellas de 250 ml concentrado ( )',
    question: 'Institucional: la cliente escribió "no sé de qué son y el precio no corresponde".',
  },
]

async function main() {
  const commit = process.argv.includes('--commit')

  console.log('='.repeat(70))
  console.log(`REGLAS DEL HISTÓRICO ${commit ? '(APLICANDO)' : '(DRY RUN)'}`)
  console.log('='.repeat(70))

  if (commit) {
    for (const r of RULES) {
      const rowNumber = r.rowNumber ?? GLOBAL_ROW
      const unmappedName = `UNMAPPED: ${r.text}`
      const rule = await prisma.historicProductMapping.upsert({
        where: { unmappedName_rowNumber: { unmappedName, rowNumber } },
        create: {
          unmappedName,
          rowNumber,
          ignored: r.ignored ?? false,
          multiplyByQuantity: r.multiplyByQuantity ?? true,
        },
        update: {
          ignored: r.ignored ?? false,
          multiplyByQuantity: r.multiplyByQuantity ?? true,
        },
      })
      await prisma.historicMappingComponent.deleteMany({ where: { mappingId: rule.id } })
      if (!r.ignored && r.components) {
        await prisma.historicMappingComponent.createMany({
          data: r.components.map((c) => ({ ...c, mappingId: rule.id })),
        })
      }
    }
    console.log(`\nEscritas ${RULES.length} reglas.\n`)
  }

  // --- Report: what each rule does, and whether the units match the client ----
  for (const r of RULES) {
    const scope = r.rowNumber ? `línea ${r.rowNumber}` : 'todas las líneas'
    const what = r.ignored
      ? 'IGNORAR'
      : (r.components ?? []).map((c) => `${c.quantity}x ${c.productName}`).join(' + ')
    console.log(`\n  "${r.text}"  (${scope})`)
    console.log(`     -> ${what}`)
    console.log(`     ${r.why}`)
  }

  // --- Verify against the client's own unit totals ----------------------------
  const rulesForIndex = RULES.map((r) => ({
    unmappedName: `UNMAPPED: ${r.text}`,
    rowNumber: r.rowNumber ?? GLOBAL_ROW,
    ignored: r.ignored ?? false,
    multiplyByQuantity: r.multiplyByQuantity ?? true,
    components: r.components ?? [],
  }))
  const index = new MappingIndex(rulesForIndex)

  // Every line where the client stated a unit total, including lines resolved by
  // a global rule (which have no rowNumber of their own).
  const expectedByLine = new Map<number, number>()
  for (const r of RULES) {
    if (r.expectUnits !== undefined && r.rowNumber) expectedByLine.set(r.rowNumber, r.expectUnits)
  }
  for (const [line, units] of EXTRA_CHECKS) expectedByLine.set(line, units)

  const lines = [...expectedByLine.keys()]
  const sales = await prisma.historicSale.findMany({
    where: { rowNumber: { in: lines } },
    include: { items: true },
  })

  console.log('\n' + '='.repeat(70))
  console.log('COMPROBACIÓN DE UNIDADES (contra lo que dijo la cliente)')
  console.log('='.repeat(70))

  let ok = 0
  let bad = 0
  for (const line of lines.sort((a, b) => a - b)) {
    const sale = sales.find((s) => s.rowNumber === line)
    if (!sale) continue
    const expected = expectedByLine.get(line) as number
    let total = 0
    let pending = 0
    for (const it of sale.items) {
      const res = resolveItem(it, sale.rowNumber, index)
      if (res.status === 'sin-clasificar') pending += 1
      total += res.units.reduce((n, u) => n + u.quantity, 0)
    }
    const mark = total === expected ? 'OK ' : '!! '
    if (total === expected) ok += 1
    else bad += 1
    console.log(
      `  ${mark} línea ${String(line).padEnd(4)} calculado ${String(total).padStart(3)} und` +
        `   cliente ${String(expected).padStart(3)} und` +
        (pending ? `   (${pending} frag. aún sin regla)` : '')
    )
    if (total !== expected) console.log(`        "${sale.rawProduct}"`)
  }
  console.log(`\n  Coinciden: ${ok}   No coinciden: ${bad}`)

  console.log('\n' + '='.repeat(70))
  console.log('PENDIENTES — falta respuesta de la cliente')
  console.log('='.repeat(70))
  for (const p of PENDING) {
    console.log(`  línea ${p.line}: "${p.text}"\n     ${p.question}`)
  }

  console.log(
    commit
      ? '\nListo.'
      : '\nDRY RUN — no se escribió nada. Ejecuta con --commit para aplicar.'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
