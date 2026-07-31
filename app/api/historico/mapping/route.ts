import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { GLOBAL_ROW } from '@/lib/historic-mapping'

/**
 * POST /api/historico/mapping
 *
 * Saves what an unmapped historic text means. Three shapes:
 *
 *   one product   { unmappedName, components: [{ productName, quantity: 1 }] }
 *   a bundle/kit  { unmappedName, components: [ ...several... ] }
 *   noise         { unmappedName, ignored: true }
 *
 * Optional `rowNumber` scopes the rule to a single CSV line (0 = all lines).
 * Optional `multiplyByQuantity` (default true) says whether the components are
 * per unit ("3 kits melón" = 3x) or a flat total ("2 cajas" = 6 units).
 *
 * An empty `components` with `ignored: false` DELETES the rule, so the item
 * goes back to "sin clasificar".
 *
 * Writes only to the historic_* tables — never to customers/products/orders.
 */
const bodySchema = z.object({
  unmappedName: z.string().min(1),
  rowNumber: z.number().int().min(0).default(GLOBAL_ROW),
  ignored: z.boolean().default(false),
  multiplyByQuantity: z.boolean().default(true),
  components: z
    .array(
      z.object({
        productName: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .default([]),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { unmappedName, rowNumber, ignored, multiplyByQuantity } = parsed.data
    const components = parsed.data.components
      .map((c) => ({ productName: c.productName.trim(), quantity: c.quantity }))
      .filter((c) => c.productName !== '')

    // Nothing assigned and not ignored -> remove the rule entirely.
    if (!ignored && components.length === 0) {
      await prisma.historicProductMapping.deleteMany({ where: { unmappedName, rowNumber } })
      return NextResponse.json({ ok: true, saved: false })
    }

    // Replace the rule and its components together, so a rule is never left
    // half-updated.
    await prisma.$transaction(async (tx) => {
      const rule = await tx.historicProductMapping.upsert({
        where: { unmappedName_rowNumber: { unmappedName, rowNumber } },
        create: { unmappedName, rowNumber, ignored, multiplyByQuantity },
        update: { ignored, multiplyByQuantity },
      })
      await tx.historicMappingComponent.deleteMany({ where: { mappingId: rule.id } })
      if (!ignored) {
        await tx.historicMappingComponent.createMany({
          data: components.map((c) => ({ ...c, mappingId: rule.id })),
        })
      }
    })

    return NextResponse.json({ ok: true, saved: true, ignored, components })
  } catch {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
