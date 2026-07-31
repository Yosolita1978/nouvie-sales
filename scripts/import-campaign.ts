/**
 * Merge the June 2026 phone-campaign sheet into the customers table.
 *
 * Dry run (prints every change it would make, writes NOTHING):
 *   npx tsx scripts/import-campaign.ts "../../Downloads/resumen informe Jueves  25 Junio.xlsx"
 *
 * Apply:
 *   npx tsx scripts/import-campaign.ts "<ruta>" --commit
 *
 * Matching order: teléfono -> email -> nombre exacto. Anything that matches
 * nothing is created as a new customer with origin = "campana".
 *
 * DECIDED WITH THE CLIENT (jul 2026): the campaign data WINS. It is the most
 * recent information — they called these people — so a phone/email/address in
 * the sheet overwrites what the DB had. Every overwrite is printed so there is
 * a record of what changed.
 *
 * The column "INTERESADA EN VOLVER A COMPRAR" is IGNORED on purpose: it is
 * empty in all 523 rows because the question was never actually asked.
 *
 * Idempotent: re-running matches the same people and rewrites the same values.
 */

import path from 'path'
import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'
import { phoneKey, emailKey, normalizeName, nameSimilarity } from '../lib/historic-clients'

const prisma = new PrismaClient()

// The call happened on this date (from the file name: jueves 25 de junio 2026).
const CAMPAIGN_DATE = new Date('2026-06-25T00:00:00Z')

// -----------------------------------------------------------------------------
// SAME PERSON, WRITTEN DIFFERENTLY.
//
// The campaign wrote some names incompletely, so they match nothing and would be
// created as duplicates. Key = the name exactly as it appears in the sheet.
// Value = the cédula of the customer they really are.
//
// To reject one of these, delete the line: that person is then created as a new
// customer. To add one, run the dry run and read the "posibles duplicados"
// section — it prints every case with both records' phone and email.
// -----------------------------------------------------------------------------
const SAME_PERSON: Record<string, string> = {
  // email amggarrido@yahoo.com = Gómez GARRIDO, el apellido que la hoja perdió
  'Adriana María Gómez Gómez': '51900107',
  // apellidos invertidos; su email dice "dominichini"
  'DIANA DOMINICHINI SANCHEZ': '52503856',
  // "De la Cruz" es segundo nombre; los dos apellidos coinciden
  'ARTURO SALAZAR POSADA': '19101500',
  // email en la BD ruizglucy@hotmail.com = RUIZ Gómez, LUCila
  'Lucila Ruiz': '51684888',
  // mismos tres nombres; la hoja no trae email para confirmarlo
  'Carlos Alberto García': '79789129',
  // NO incluida a propósito: "Adriana Gomez" tiene OTRO teléfono que
  // "ADRIANA LUCIA PATIÑO GOMEZ" y otro apellido. Se crea como cliente nuevo.
}

interface CampaignRow {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  city: string | null
  comment: string | null
  acceptsMarketing: boolean
}

/**
 * Loose sanity check, not full validation: the sheet was typed during phone
 * calls and contains entries like "0611@gmail.com" where the name was lost.
 */
function looksLikeEmail(s: string): boolean {
  const m = s.trim().match(/^([^@\s]+)@([^@\s]+\.[a-z]{2,})$/i)
  if (!m) return false
  return m[1].length >= 3 && !/^\d+$/.test(m[1]) // no puro-números como usuario
}

function cell(row: ExcelJS.Row, col: number): string | null {
  const v = row.getCell(col).value
  if (v === null || v === undefined) return null
  // Emails come through as hyperlink objects.
  if (typeof v === 'object' && v !== null && 'text' in v) {
    const t = String((v as { text: unknown }).text).trim()
    return t === '' ? null : t
  }
  const s = String(v).trim()
  return s === '' ? null : s
}

async function readSheet(file: string): Promise<CampaignRow[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const ws = wb.worksheets[0]
  const rows: CampaignRow[] = []

  ws.eachRow((row, i) => {
    if (i === 1) return // header
    // A..D = primer nombre, segundo nombre, primer apellido, segundo apellido
    const name = [cell(row, 1), cell(row, 2), cell(row, 3), cell(row, 4)]
      .filter((p): p is string => p !== null)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (name === '') return

    rows.push({
      name,
      address: cell(row, 5),
      phone: cell(row, 6),
      email: cell(row, 7),
      city: cell(row, 8),
      comment: cell(row, 9),
      acceptsMarketing: (cell(row, 10) ?? '').toUpperCase() === 'SI',
    })
  })

  return rows
}

async function main() {
  const commit = process.argv.includes('--commit')
  const fileArg = process.argv[2]
  if (!fileArg || fileArg.startsWith('--')) {
    console.error('Falta la ruta del archivo .xlsx')
    process.exitCode = 1
    return
  }
  const file = path.resolve(process.cwd(), fileArg)

  const rows = await readSheet(file)
  const customers = await prisma.customer.findMany({
    select: {
      id: true, name: true, phone: true, email: true, address: true, city: true,
      cedula: true, acceptsMarketing: true,
    },
  })

  const byPhone = new Map<string, (typeof customers)[number]>()
  const byEmail = new Map<string, (typeof customers)[number]>()
  const byName = new Map<string, (typeof customers)[number]>()
  const byCedula = new Map<string, (typeof customers)[number]>()
  for (const c of customers) {
    if (c.cedula) byCedula.set(c.cedula, c)
    const ph = phoneKey(c.phone)
    if (ph !== '' && !byPhone.has(ph)) byPhone.set(ph, c)
    const em = emailKey(c.email)
    if (em.includes('@') && !byEmail.has(em)) byEmail.set(em, c)
    const nm = normalizeName(c.name)
    if (!byName.has(nm)) byName.set(nm, c)
  }

  console.log('='.repeat(72))
  console.log(`CAMPAÑA TELEFÓNICA ${commit ? '(APLICANDO)' : '(DRY RUN)'}`)
  console.log('='.repeat(72))
  console.log(`Archivo: ${path.basename(file)}`)
  console.log(`Filas: ${rows.length} | clientes en la plataforma: ${customers.length}\n`)

  const seenPhones = new Set<string>()
  const overwrites: string[] = []
  const badEmails: string[] = []
  const nearDuplicates: string[] = []
  const forcedMerges: string[] = []
  let updated = 0
  let created = 0
  let dupInSheet = 0
  const createdNames: string[] = []

  for (const r of rows) {
    const ph = phoneKey(r.phone)

    // The sheet repeats a few numbers; keep the first row for each.
    if (ph !== '') {
      if (seenPhones.has(ph)) {
        dupInSheet += 1
        continue
      }
      seenPhones.add(ph)
    }

    // A confirmed "same person" decision wins over every automatic rule.
    const forcedCedula = SAME_PERSON[r.name]
    const forced = forcedCedula ? byCedula.get(forcedCedula) : undefined
    if (forcedCedula && !forced) {
      console.log(`  ⚠️  SAME_PERSON: no existe la cédula ${forcedCedula} para "${r.name}"`)
    }

    if (forced) {
      forcedMerges.push(`  "${r.name}"  ->  ${forced.name} (cédula ${forcedCedula})`)
    }

    const match =
      forced ??
      (ph !== '' ? byPhone.get(ph) : undefined) ??
      (emailKey(r.email).includes('@') ? byEmail.get(emailKey(r.email)) : undefined) ??
      byName.get(normalizeName(r.name))

    if (match) {
      // Campaign wins: overwrite when it has a value. Record what changed.
      const changes: Record<string, string | boolean | Date> = {}
      const note = (field: string, before: string | null, after: string) => {
        if (before !== null && before !== '' && before !== after) {
          overwrites.push(`  ${match.name}: ${field} "${before}" -> "${after}"`)
        }
      }

      // Same number written differently ("315 7678585" vs "3157678585") is not
      // a change: compare the digits, not the formatting.
      if (r.phone !== null && phoneKey(r.phone) !== phoneKey(match.phone)) {
        note('teléfono', match.phone, r.phone)
        changes.phone = r.phone
      }
      // The campaign wins, but not with a broken address. A transcription like
      // "0611@gmail.com" must not overwrite a real one.
      if (r.email !== null) {
        if (!looksLikeEmail(r.email)) {
          badEmails.push(`  ${match.name}: se ignora "${r.email}" (parece mal escrito)`)
        } else if (emailKey(r.email) !== emailKey(match.email)) {
          note('email', match.email, r.email)
          changes.email = r.email
        }
      }
      if (r.address !== null) { note('dirección', match.address, r.address); changes.address = r.address }
      if (r.city !== null) { note('ciudad', match.city, r.city); changes.city = r.city }

      changes.acceptsMarketing = r.acceptsMarketing
      if (r.comment !== null) changes.campaignNote = r.comment
      changes.lastContactedAt = CAMPAIGN_DATE

      updated += 1
      if (commit) {
        await prisma.customer.update({ where: { id: match.id }, data: changes })
      }
      continue
    }

    // Before creating: is there an existing customer with a very similar name?
    // Those are likely the same person spelled differently, so flag them.
    const near = customers
      .map((c) => ({ name: c.name, score: nameSimilarity(r.name, c.name) }))
      .filter((c) => c.score >= 0.8)
      .sort((a, b) => b.score - a.score)[0]
    if (near) {
      nearDuplicates.push(`  "${r.name}" se parece a "${near.name}" (${Math.round(near.score * 100)}%)`)
    }

    created += 1
    createdNames.push(r.name)
    if (commit) {
      const customer = await prisma.customer.create({
        data: {
          name: r.name,
          phone: r.phone ?? '',
          email: r.email,
          address: r.address,
          city: r.city,
          origin: 'campana',
          acceptsMarketing: r.acceptsMarketing,
          campaignNote: r.comment,
          lastContactedAt: CAMPAIGN_DATE,
        },
      })
      // Keep the indexes fresh so a later duplicate row in the same run matches.
      const nm = normalizeName(customer.name)
      if (!byName.has(nm)) byName.set(nm, { ...customer })
    }
  }

  const consented = rows.filter((r) => r.acceptsMarketing).length

  console.log(`  Actualizados:              ${updated}`)
  console.log(`  Creados (origin campana):  ${created}`)
  console.log(`  Filas repetidas en la hoja: ${dupInSheet} (se ignoran)`)
  console.log(`  Aceptan notificaciones:    ${consented}`)

  console.log(`\n--- Datos que la campaña SOBREESCRIBE (${overwrites.length}) ---`)
  overwrites.slice(0, 25).forEach((o) => console.log(o))
  if (overwrites.length > 25) console.log(`  ... y ${overwrites.length - 25} más`)

  console.log(`\n--- Unidos a mano por SAME_PERSON (${forcedMerges.length}) ---`)
  console.log('  Decisiones ya tomadas: NO se crean, se actualiza el cliente existente.')
  forcedMerges.forEach((f) => console.log(f))

  console.log(`\n--- Emails ignorados por estar mal escritos (${badEmails.length}) ---`)
  badEmails.slice(0, 15).forEach((b) => console.log(b))
  if (badEmails.length > 15) console.log(`  ... y ${badEmails.length - 15} más`)

  console.log(`\n--- OJO: posibles duplicados antes de crear (${nearDuplicates.length}) ---`)
  nearDuplicates.forEach((n) => console.log(n))

  console.log(`\n--- Clientes nuevos (${created}) ---`)
  createdNames.slice(0, 20).forEach((n) => console.log(`  ${n}`))
  if (createdNames.length > 20) console.log(`  ... y ${createdNames.length - 20} más`)

  console.log(
    commit ? '\nListo.' : '\nDRY RUN — no se escribió nada. Añade --commit para aplicar.'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
