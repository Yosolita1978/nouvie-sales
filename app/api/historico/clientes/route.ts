import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { normalizeName, onlyDigits } from '@/lib/historic-clients'

/**
 * POST /api/historico/clientes
 *
 * Resolves ONE client of the old sheet. Three actions:
 *
 *   vincular  { clientKey, clientName, customerId }  -> link to an existing customer
 *   crear     { clientKey, clientName }              -> create a new customer from the
 *                                                       sheet's data (origin "historico")
 *   omitir    { clientKey, clientName }              -> reviewed, deliberately left unlinked
 *
 * "crear" is the only place the app writes to the live customers table, and it
 * always stamps origin = "historico" so those records stay identifiable.
 */
const bodySchema = z.object({
  clientKey: z.string().min(1),
  clientName: z.string().min(1),
  action: z.enum(['vincular', 'crear', 'omitir']),
  customerId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { clientKey, clientName, action, customerId } = parsed.data

    // --- Link to an existing customer ---------------------------------------
    if (action === 'vincular') {
      if (!customerId) {
        return NextResponse.json({ error: 'Falta el cliente a vincular' }, { status: 400 })
      }
      const customer = await prisma.customer.findUnique({ where: { id: customerId } })
      if (!customer) {
        return NextResponse.json({ error: 'Ese cliente no existe' }, { status: 404 })
      }
      // Several sheet spellings CAN point at the same customer ("Jaime Perilla"
      // and "Jaime Alberto Perilla" are one person), so this is allowed. We just
      // report it back so the UI can say so.
      const alsoLinked = await prisma.historicClientMatch.findFirst({
        where: { customerId, clientKey: { not: clientKey } },
      })
      await prisma.historicClientMatch.upsert({
        where: { clientKey },
        create: { clientKey, clientName, customerId, matchedBy: 'manual', confirmed: true },
        update: { customerId, matchedBy: 'manual', confirmed: true },
      })
      return NextResponse.json({
        ok: true,
        customerName: customer.name,
        alsoLinkedTo: alsoLinked?.clientName ?? null,
      })
    }

    // --- Reviewed, but not a customer ---------------------------------------
    if (action === 'omitir') {
      await prisma.historicClientMatch.upsert({
        where: { clientKey },
        create: { clientKey, clientName, customerId: null, matchedBy: 'manual', confirmed: true },
        update: { customerId: null, matchedBy: 'manual', confirmed: true },
      })
      return NextResponse.json({ ok: true })
    }

    // --- Create a new customer from the sheet -------------------------------
    const existing = await prisma.historicClientMatch.findUnique({ where: { clientKey } })
    if (existing?.customerId) {
      return NextResponse.json({ error: 'Este cliente ya está vinculado' }, { status: 409 })
    }

    // The sheet's rows for this client; take the first non-empty value of each.
    const sales = await prisma.historicSale.findMany({
      select: { clientName: true, cedula: true, email: true, phone: true, city: true, address: true },
    })
    const mine = sales.filter((s) => normalizeName(s.clientName) === clientKey)
    const pick = (f: 'cedula' | 'email' | 'phone' | 'city' | 'address'): string | null =>
      mine.map((s) => s[f]).find((v) => v !== null && v !== '') ?? null

    const cedulaDigits = onlyDigits(pick('cedula'))
    const cedula = cedulaDigits.length >= 5 ? cedulaDigits : null
    // cedula is UNIQUE — never collide with an existing customer.
    const cedulaFree =
      cedula && !(await prisma.customer.findUnique({ where: { cedula } })) ? cedula : null

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: clientName,
          cedula: cedulaFree,
          email: pick('email'),
          phone: pick('phone') ?? '', // required column; the sheet often has none
          city: pick('city'),
          address: pick('address'),
          origin: 'historico',
        },
      })
      await tx.historicClientMatch.upsert({
        where: { clientKey },
        create: { clientKey, clientName, customerId: customer.id, matchedBy: 'creado', confirmed: true },
        update: { customerId: customer.id, matchedBy: 'creado', confirmed: true },
      })
      return customer
    })

    return NextResponse.json({ ok: true, customerName: created.name, created: true })
  } catch {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
