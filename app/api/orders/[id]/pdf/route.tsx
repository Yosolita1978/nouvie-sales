import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import { OrderPdfDocument } from '@/lib/pdf/OrderPdfDocument'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    const orderData = {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      createdAt: order.createdAt,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      notes: order.notes,
      customer: {
        name: order.customer.name,
        cedula: order.customer.cedula,
        phone: order.customer.phone,
        address: order.customer.address,
        city: order.customer.city,
      },
      items: order.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: {
          name: item.product.name,
          unit: item.product.unit,
        },
      })),
    }

    const pdfBuffer = await renderToBuffer(
      <OrderPdfDocument order={orderData} />
    )

    return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${order.orderNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al generar PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}