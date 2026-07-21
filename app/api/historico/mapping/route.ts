import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/historico/mapping
 * Body: { unmappedName: string, productName: string }
 *
 * Assigns a canonical product to an unmapped historic item. An empty
 * productName removes the mapping (item goes back to "sin clasificar").
 * Writes only to historic_product_mappings — never to live tables.
 */
const bodySchema = z.object({
  unmappedName: z.string().min(1),
  productName: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { unmappedName } = parsed.data
    const productName = parsed.data.productName.trim()

    if (productName === '') {
      await prisma.historicProductMapping.deleteMany({ where: { unmappedName } })
      return NextResponse.json({ ok: true, mapped: false })
    }

    await prisma.historicProductMapping.upsert({
      where: { unmappedName },
      create: { unmappedName, productName },
      update: { productName },
    })
    return NextResponse.json({ ok: true, mapped: true, productName })
  } catch {
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}
