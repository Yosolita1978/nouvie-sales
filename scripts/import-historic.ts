/**
 * Import the historic ventas CSV into the isolated historic_sales tables.
 *
 * Run a DRY RUN (parses + prints a summary, writes NOTHING):
 *   npx tsx scripts/import-historic.ts
 *
 * Actually write to the DB (idempotent — clears & rebuilds the two
 * historic tables, so re-running never duplicates):
 *   npx tsx scripts/import-historic.ts --commit
 *
 * This NEVER touches customers / products / orders. The historic tables are
 * decoupled (see prisma/schema.prisma). Client and product references are
 * plain strings, matched to the live DB later in a separate read-only step.
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CSV_PATH = path.resolve(
  process.cwd(),
  '..',
  'nouvie-historic',
  'VENTAS NOUVIE - VENTAS (1).csv'
)

// Confirmed by the client: the 2024 colored bottles ARE these 5 Hogar products.
const COLOR_TO_PRODUCT: [string, string][] = [
  ['amarillo', 'Desengrasante Multiusos'],
  ['rosado', 'Detergente Neutro'],
  ['azul', 'Limpia Vidrios'],
  ['verde', 'Limpia Pisos'],
  ['blanco', 'Lustra Muebles'],
]

// A "kit de 5" with no explicit contents = one of each of the 5 products.
const KIT5_PRODUCTS = COLOR_TO_PRODUCT.map(([, name]) => name)

// -----------------------------------------------------------------------------
// MANUAL CORRECTIONS. Fill this in to fix "UNMAPPED" items after reviewing
// scripts/output/historic-unmapped-review.csv. Key = the exact value from the
// review file's "clave_override" column. Value = the canonical product name.
// Re-run the dry run after editing to see coverage improve. Example:
//   'kit melon': 'Kit Capilar Melón',
//   'acero': 'Limpia Acero',
// -----------------------------------------------------------------------------
const OVERRIDES: Record<string, string> = {
  // add your corrections here
}

// Correct known data-entry typos in the source AMOUNT, keyed by CSV line number.
// Both had an extra ".000" group ($152.000.000 instead of $152.000).
const AMOUNT_OVERRIDES: Record<number, number> = {
  157: 152000, // María Gladys Ochoa — "2 amarillos 1 rosado"
  220: 158000, // Elsa Lopez — "Prom kit melon mas 1 molding melon"
}

// Spanish month tokens (incl. common typos/abbreviations). First hit wins.
const MONTHS: [string, number][] = [
  ['enero', 1], ['febrero', 2], ['marzo', 3], ['abril', 4], ['mayo', 5],
  ['junio', 6], ['juni', 6], ['julio', 7], ['juli', 7],
  ['agosto', 8], ['afosto', 8], ['agost', 8],
  ['septiembre', 9], ['septie', 9], ['sept', 9], ['sep', 9],
  ['octubre', 10], ['oct', 10], ['noviembre', 11], ['nov', 11],
  ['diciembre', 12], ['dic', 12],
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedItem {
  productName: string
  quantity: number
  fromKit: boolean
  rawText: string
}

interface ParsedRow {
  rowNumber: number
  rawDate: string
  rawAmount: string
  rawProduct: string
  saleDate: Date
  year: number
  amount: number
  clientName: string
  cedula: string | null
  email: string | null
  phone: string | null
  city: string | null
  address: string | null
  paymentStatus: string | null
  logistica: string | null
  observacion: string | null
  flags: string[]
  items: ParsedItem[]
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalize(s: string): string {
  return stripAccents(s.toLowerCase()).replace(/\s+/g, ' ').trim()
}

function orNull(s: string | undefined): string | null {
  const v = (s ?? '').trim()
  return v === '' ? null : v
}

// ---------------------------------------------------------------------------
// Date + year parsing
// ---------------------------------------------------------------------------

interface DayMonth {
  month: number | null
  day: number | null
  explicitYear: number | null
}

function parseDayMonth(rawDate: string): DayMonth {
  const s = normalize(rawDate)

  const yearMatch = s.match(/\b(20\d{2})\b/)
  const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null

  let month: number | null = null
  for (const [token, num] of MONTHS) {
    if (s.includes(token)) {
      month = num
      break
    }
  }

  // Day = first 1-2 digit number that is not the year and is 1..31.
  let day: number | null = null
  const withoutYear = s.replace(/\b20\d{2}\b/g, ' ')
  const dayMatch = withoutYear.match(/\b(\d{1,2})\b/) ?? withoutYear.match(/(\d{1,2})/)
  if (dayMatch) {
    const d = parseInt(dayMatch[1], 10)
    if (d >= 1 && d <= 31) day = d
  }

  return { month, day, explicitYear }
}

// ---------------------------------------------------------------------------
// Amount parsing (handles US "$78,000.00", CO "$221.700,00", "$185.000", ...)
// ---------------------------------------------------------------------------

function normalizeAmount(raw: string): { value: number; flag: string | null } {
  const s = raw.replace(/[^0-9.,]/g, '')
  if (s === '') return { value: 0, flag: 'monto vacío' }

  const lastSep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let value: number

  if (lastSep === -1) {
    value = parseInt(s, 10)
  } else {
    const decimals = s.length - lastSep - 1
    if (decimals === 2) {
      // Rightmost separator is the decimal point; the rest are thousands.
      const intPart = s.slice(0, lastSep).replace(/[.,]/g, '')
      const decPart = s.slice(lastSep + 1)
      value = parseFloat(`${intPart}.${decPart}`)
    } else {
      // No 2-digit decimals -> every separator is a thousands separator.
      value = parseInt(s.replace(/[.,]/g, ''), 10)
    }
  }

  if (!isFinite(value)) return { value: 0, flag: `monto no parseable: ${raw}` }
  if (value > 5_000_000) return { value, flag: `monto atípico (revisar): ${raw}` }
  return { value, flag: null }
}

// ---------------------------------------------------------------------------
// Product parsing
// ---------------------------------------------------------------------------

function detectScent(f: string): string {
  if (f.includes('reparacion')) return 'Reparación Intensa'
  if (f.includes('revitaliz')) return 'Revitalizante'
  if (f.includes('suave') || f.includes('liso')) return 'Suave y Liso'
  if (f.includes('hombre')) return 'Hombre'
  if (f.includes('kiwi') && f.includes('acai')) return 'Kiwi & Acai'
  if (f.includes('kiwi')) return 'Kiwi'
  if (f.includes('melon')) return 'Melón'
  if (f.includes('honey')) return 'Honey'
  if (f.includes('naranja')) return 'Naranja'
  if (f.includes('acai')) return 'Acai'
  return ''
}

function withScent(base: string, f: string): string {
  const scent = detectScent(f)
  return scent ? `${base} ${scent}` : base
}

// Common misspellings seen in the sheet -> corrected substring.
const TYPO_FIXES: [RegExp, string][] = [
  [/desn?gras/g, 'desengrasante'],       // desngrasante, desgras
  [/amar?l{1,3}o|amrillo/g, 'amarillo'], // amrillo, amarlllo, amarllo
  [/masac?arilla|masck|mask/g, 'mascarilla'],
  [/moldin|moldim/g, 'molding'],
  [/vidirios/g, 'vidrios'],              // limpia vidirios
  [/lava\s+vajilla/g, 'lavavajilla'],    // lava vajillas
]

/** Fragments that are shipping/payment noise, not products. */
function isNoise(fragment: string): boolean {
  const n = normalize(fragment).replace(/\d+/g, '').trim()
  return n === '' || n.includes('envio') || n.includes('flete')
}

/** The normalized key a fragment is matched on — also the OVERRIDES key. */
function canonKey(fragment: string): string {
  let f = normalize(fragment)
  for (const [re, fix] of TYPO_FIXES) f = f.replace(re, fix)
  return f
}

/** Map a single normalized fragment to a canonical product name, or null. */
function classify(fragment: string): string | null {
  const f = canonKey(fragment)

  // Manual corrections win over everything else.
  if (f in OVERRIDES) return OVERRIDES[f]

  // Colors (cleaning line). Substring match also covers plurals (amarillos...).
  for (const [root, name] of COLOR_TO_PRODUCT) {
    if (f.includes(root)) return name
  }

  // Named cleaning products (order matters: more specific first).
  if (f.includes('desengrasante')) return 'Desengrasante Multiusos'
  if (f.includes('lavavajilla')) return 'Detergente Lavavajillas'
  if (f.includes('detergente')) return 'Detergente Neutro'
  if (f.includes('limpiavidrio') || f.includes('limpia vidrio')) return 'Limpia Vidrios'
  if (f.includes('limpiapiso') || f.includes('limpia piso')) return 'Limpia Pisos'
  if (f.includes('superficie') || f.includes('pantalla')) return 'Limpia Superficies'
  if (f.includes('lustra') || f.includes('limpia muebles')) return 'Lustra Muebles'
  if (f.includes('espumero')) return 'Espumero para manos'
  if (f.includes('sanitiz')) return 'Sanitizante'
  if (f.includes('desincrust')) return 'Desincrustante'
  if (
    f.includes('dosificador') || f.includes('dosficador') ||
    f.includes('dispensador') || f.includes('dispensadore')
  ) return 'Dosificador'

  // Hair line (scent becomes part of the product name).
  if (f.includes('shampoo') || f.includes('champu')) return withScent('Shampoo', f)
  if (f.includes('mascarilla') || f.includes('masque')) return withScent('Mascarilla', f)
  if (f.includes('locion')) return withScent('Loción', f)
  if (f.includes('molding') || f.includes('moldead') || f.includes('moldeador')) {
    return withScent('Moldeador', f)
  }
  if (f.includes('tratamiento')) return withScent('Tratamiento', f)
  if (f.includes('desinfectante')) return 'Desinfectante Frutas y Verduras'
  if (f.includes('sampling') || f.includes('muestra')) return 'Muestra (sampling)'

  // Named kits (not the "kit de N" assortment, which is handled separately).
  if (f.includes('kit desengrasante')) return 'Kit Desengrasante Multiusos'
  if (f.includes('kit lavavajilla')) return 'Kit Lavavajilla'
  if (f.includes('kit suave') || f.includes('suaveyliso')) return 'Kit Suave y Liso'
  if (f.includes('viajero')) return withScent('Kit Viajero', f)

  return null
}

/**
 * Split a product string into fragments on "+", ",", " y ", and on the space
 * before a new "<qty> <product>" run (so "1 amarillo 1 azul" becomes two items).
 * Multi-word product names are protected first so they are not split apart, and
 * a leading quantity followed by a unit (60 ml, 2 litros) is not treated as a
 * new item.
 */
function splitFragments(text: string): string[] {
  return text
    .replace(/suave y liso/g, 'suaveyliso')
    .replace(/frutas y verduras/g, 'frutasyverduras')
    .replace(/superficies y pantallas/g, 'superficiespantallas')
    .split(/[,+]|\sy\s|\s+(?=\d+\s+(?!ml\b|lt\b|litros?\b|gr\b|gramos?\b|de\b)[a-zñ])/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

/**
 * Pull a leading quantity off a fragment ("15 amarillos" -> 15). A leading
 * number that is actually a volume/size ("500 ml", "2 litros") is NOT a unit
 * count, so it maps to quantity 1.
 */
function leadingQty(fragment: string): { qty: number; rest: string } {
  const m = fragment.match(/^\s*(\d+)\s*/)
  if (!m) return { qty: 1, rest: fragment }
  const rest = fragment.slice(m[0].length)
  if (/^(ml|lt|litros?|gr|gramos?|g)\b/.test(normalize(rest))) {
    return { qty: 1, rest }
  }
  return { qty: parseInt(m[1], 10), rest }
}

function hasContent(fragment: string): boolean {
  return /[a-z]{3,}/.test(normalize(fragment))
}

function parseProducts(rawProduct: string): { items: ParsedItem[]; flags: string[] } {
  const items: ParsedItem[] = []
  const flags: string[] = []

  // Clean noise: prices ($ 48.000), promo notes.
  let text = normalize(rawProduct)
    .replace(/\$\s*[\d.,]+/g, ' ')
    .replace(/\(?\s*promo(?:cion)?\s*\d*\s*\)?/g, ' ')
    .replace(/\bprom\b/g, ' ')

  // Normalize kits whose contents are written with ":" / "=" or as a bare color
  // list (no parentheses) into the parenthesized "kit (contents)" form.
  text = text
    .replace(/(kit\s*(?:de|por|x)?\s*(?:5|cinco|3|tres))\s*[:=]\s*([^+]*)/g, '$1 ($2)')
    .replace(
      /(kit\s*(?:de|por|x)?\s*(?:5|cinco|3|tres))\s+((?:\d*\s*(?:amarillo|rosado|azul|verde|blanco)s?[\s,]*(?:y\s+)?)+)/g,
      '$1 ($2)'
    )

  // Handle "kit de 5 / kit de 3" assortments first, then remove them.
  // "de", "por" and "x" are all used in the sheet ("kit de 5", "kit x 5").
  const kitRegex = /(\d+)?\s*kit\s*(?:de|por|x)?\s*(5|cinco|3|tres)\b\s*(?:\(([^)]*)\))?/g
  text = text.replace(kitRegex, (_m, qtyStr, sizeStr, inner) => {
    const kitCount = qtyStr ? parseInt(qtyStr, 10) : 1
    const size = sizeStr === '5' || sizeStr === 'cinco' ? 5 : 3
    const contents = (inner ?? '').trim()

    if (contents && /[a-z0-9]/.test(contents)) {
      // Explicit contents in parentheses -> parse them as the total.
      for (const frag of splitFragments(contents)) {
        const { qty, rest } = leadingQty(frag)
        const name = classify(rest)
        if (name) {
          items.push({ productName: name, quantity: qty, fromKit: true, rawText: frag })
        } else if (hasContent(frag) && !isNoise(frag)) {
          items.push({ productName: `UNMAPPED: ${canonKey(rest)}`, quantity: qty, fromKit: true, rawText: frag })
          flags.push(`kit: fragmento sin mapear "${frag}"`)
        }
      }
    } else if (size === 5) {
      for (const name of KIT5_PRODUCTS) {
        items.push({ productName: name, quantity: kitCount, fromKit: true, rawText: 'kit de 5' })
      }
    } else {
      items.push({
        productName: 'UNMAPPED: kit de 3 (contenido no especificado)',
        quantity: kitCount,
        fromKit: true,
        rawText: 'kit de 3',
      })
      flags.push('kit de 3 sin contenido especificado')
    }
    return ' '
  })

  // Remaining fragments.
  for (const frag of splitFragments(text)) {
    const { qty, rest } = leadingQty(frag)
    const name = classify(rest)
    if (name) {
      items.push({ productName: name, quantity: qty, fromKit: false, rawText: frag })
    } else if (hasContent(frag) && !isNoise(frag)) {
      items.push({ productName: `UNMAPPED: ${canonKey(rest)}`, quantity: qty, fromKit: false, rawText: frag })
      flags.push(`fragmento sin mapear "${frag}"`)
    }
  }

  if (items.length === 0) flags.push('sin productos reconocidos')
  return { items, flags }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function isSeparatorProduct(pedido: string): boolean {
  return pedido === '' || /^[-–—.\s]+$/.test(pedido)
}

async function main() {
  const commit = process.argv.includes('--commit')

  const content = fs.readFileSync(CSV_PATH, 'utf8')
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: false })
  const rows = parsed.data

  const result: ParsedRow[] = []
  let currentYear = 2024 // data starts in abril 2024
  let prevMonth = 0
  let skipped = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 1 // 1-based file line
    const rawDate = (row[0] ?? '').trim()
    const nombre = (row[1] ?? '').trim()
    const apellido = (row[2] ?? '').trim()
    const pedido = (row[8] ?? '').trim()

    // Update year state from every row (markers included).
    const dm = parseDayMonth(rawDate)
    let yearFromMarker = false
    if (dm.explicitYear) {
      currentYear = dm.explicitYear
      yearFromMarker = true
    } else if (dm.month === 1 && prevMonth >= 10) {
      currentYear += 1 // Dec/Nov -> Jan rollover
    }
    if (dm.month) prevMonth = dm.month

    // Skip marker / separator rows (no client, or product is only dashes).
    const clientName = `${nombre} ${apellido}`.trim()
    if (clientName === '' || isSeparatorProduct(pedido)) {
      skipped++
      continue
    }

    const flags: string[] = []
    if (!dm.month) flags.push(`fecha sin mes reconocible: "${rawDate}"`)
    if (!dm.day) flags.push(`fecha sin día reconocible: "${rawDate}"`)
    flags.push(yearFromMarker ? 'año: marcador explícito' : 'año: inferido por secuencia')

    const day = dm.day ?? 1
    const month = dm.month ?? 1
    const saleDate = new Date(Date.UTC(currentYear, month - 1, day))

    const rawAmount = (row[9] ?? '').trim()
    const parsedAmount = normalizeAmount(rawAmount)
    let amount = parsedAmount.value
    if (AMOUNT_OVERRIDES[rowNumber] !== undefined) {
      amount = AMOUNT_OVERRIDES[rowNumber]
      flags.push(`monto corregido: "${rawAmount}" -> ${amount}`)
    } else if (parsedAmount.flag) {
      flags.push(parsedAmount.flag)
    }

    const { items, flags: productFlags } = parseProducts(pedido)
    flags.push(...productFlags)

    const emailRaw = (row[7] ?? '').trim()
    const email = emailRaw.includes('@') ? emailRaw : null
    if (emailRaw !== '' && email === null) flags.push(`email inválido en columna: "${emailRaw}"`)

    result.push({
      rowNumber,
      rawDate,
      rawAmount,
      rawProduct: pedido,
      saleDate,
      year: currentYear,
      amount,
      clientName,
      cedula: orNull(row[3]),
      email,
      phone: orNull(row[6]),
      city: orNull(row[4]),
      address: orNull(row[5]),
      paymentStatus: orNull(row[14]),
      logistica: orNull(row[10]),
      observacion: orNull(row[11]),
      flags,
      items,
    })
  }

  printSummary(result, skipped)
  writeUnmappedReview(result)

  if (!commit) {
    console.log('\nDRY RUN — nothing was written. Re-run with --commit to write to the DB.')
    return
  }

  console.log('\nWriting to the DB...')
  await prisma.$transaction(
    async (tx) => {
      await tx.historicSaleItem.deleteMany()
      await tx.historicSale.deleteMany()
      for (const r of result) {
        await tx.historicSale.create({
          data: {
            rowNumber: r.rowNumber,
            rawDate: r.rawDate,
            rawAmount: r.rawAmount || null,
            rawProduct: r.rawProduct,
            saleDate: r.saleDate,
            year: r.year,
            amount: r.amount,
            clientName: r.clientName,
            cedula: r.cedula,
            email: r.email,
            phone: r.phone,
            city: r.city,
            address: r.address,
            paymentStatus: r.paymentStatus,
            logistica: r.logistica,
            observacion: r.observacion,
            parseFlags: r.flags.length ? JSON.stringify(r.flags) : null,
            items: {
              create: r.items.map((it) => ({
                productName: it.productName,
                quantity: it.quantity,
                fromKit: it.fromKit,
                rawText: it.rawText,
              })),
            },
          },
        })
      }
    },
    { timeout: 120_000 }
  )
  console.log(`Done. Wrote ${result.length} sales.`)
}

// ---------------------------------------------------------------------------
// Review file: every unmapped item, with the exact key to put in OVERRIDES.
// ---------------------------------------------------------------------------

function writeUnmappedReview(result: ParsedRow[]) {
  const rows: Record<string, string>[] = []
  for (const r of result) {
    for (const it of r.items) {
      if (!it.productName.startsWith('UNMAPPED:')) continue
      const { rest } = leadingQty(it.rawText)
      rows.push({
        linea: String(r.rowNumber),
        cliente: r.clientName,
        anio: String(r.year),
        cantidad: String(it.quantity),
        clave_override: canonKey(rest),
        fragmento: it.rawText,
        pedido_completo: r.rawProduct,
      })
    }
  }

  const outDir = path.resolve(process.cwd(), 'scripts', 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'historic-unmapped-review.csv')
  fs.writeFileSync(outPath, Papa.unparse(rows), 'utf8')
  console.log(`\nReview file written: ${outPath} (${rows.length} items to review)`)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(result: ParsedRow[], skipped: number) {
  const line = '='.repeat(64)
  console.log(line)
  console.log('HISTORIC IMPORT — DRY SUMMARY')
  console.log(line)
  console.log(`Data rows parsed: ${result.length}`)
  console.log(`Rows skipped (markers/separators): ${skipped}`)

  // Per-year totals.
  console.log('\n--- Per year ---')
  const byYear = new Map<number, { count: number; total: number }>()
  for (const r of result) {
    const y = byYear.get(r.year) ?? { count: 0, total: 0 }
    y.count += 1
    y.total += r.amount
    byYear.set(r.year, y)
  }
  for (const year of [...byYear.keys()].sort()) {
    const y = byYear.get(year)!
    console.log(`  ${year}: ${y.count} sales, total $${Math.round(y.total).toLocaleString('es-CO')}`)
  }

  // Product mapping coverage.
  let mapped = 0
  let unmapped = 0
  const unmappedCounts = new Map<string, number>()
  for (const r of result) {
    for (const it of r.items) {
      if (it.productName.startsWith('UNMAPPED:')) {
        unmapped += 1
        const key = it.productName.replace('UNMAPPED: ', '')
        unmappedCounts.set(key, (unmappedCounts.get(key) ?? 0) + 1)
      } else {
        mapped += 1
      }
    }
  }
  console.log('\n--- Product items ---')
  console.log(`  Mapped: ${mapped}   Unmapped: ${unmapped}`)
  console.log('  Top unmapped fragments (review these):')
  ;[...unmappedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([frag, c]) => console.log(`    ${String(c).padStart(3)}  ${frag}`))

  // Flag overview.
  const flagged = result.filter((r) => r.flags.some((f) => !f.startsWith('año:')))
  console.log('\n--- Flags ---')
  console.log(`  Rows with a non-routine flag: ${flagged.length}`)
  flagged.slice(0, 15).forEach((r) => {
    const notable = r.flags.filter((f) => !f.startsWith('año:'))
    console.log(`    line ${r.rowNumber} (${r.clientName}): ${notable.join('; ')}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
