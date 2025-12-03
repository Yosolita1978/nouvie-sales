import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  bank: 'Banco',
  link: 'Link'
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado'
}

const shippingStatusLabels: Record<string, string> = {
  preparing: 'Por Enviar',
  shipped: 'Enviado',
  delivered: 'Entregado'
}

/**
 * GET /api/orders/export
 * 
 * Exports orders to Excel file
 * 
 * Query Parameters:
 *   - from: Start date (ISO string, optional)
 *   - to: End date (ISO string, optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    // Build where clause for date filtering
    const whereConditions: {
      orderDate?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (fromParam || toParam) {
      whereConditions.orderDate = {}
      
      if (fromParam) {
        const fromDate = new Date(fromParam)
        fromDate.setHours(0, 0, 0, 0)
        whereConditions.orderDate.gte = fromDate
      }
      
      if (toParam) {
        const toDate = new Date(toParam)
        toDate.setHours(23, 59, 59, 999)
        whereConditions.orderDate.lte = toDate
      }
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where: whereConditions,
      orderBy: { orderDate: 'desc' },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Nouvie Sales System'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Pedidos', {
      properties: { defaultColWidth: 15 }
    })

    // Define columns
    worksheet.columns = [
      { header: 'Número de Pedido', key: 'orderNumber', width: 18 },
      { header: 'Fecha', key: 'orderDate', width: 12 },
      { header: 'Cliente', key: 'customerName', width: 25 },
      { header: 'Cédula', key: 'customerCedula', width: 15 },
      { header: 'Teléfono', key: 'customerPhone', width: 15 },
      { header: 'Productos', key: 'products', width: 40 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'IVA (19%)', key: 'tax', width: 12 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Método de Pago', key: 'paymentMethod', width: 15 },
      { header: 'Estado de Pago', key: 'paymentStatus', width: 15 },
      { header: 'Estado de Envío', key: 'shippingStatus', width: 15 },
      { header: 'Número de Factura', key: 'invoiceNumber', width: 18 },
      { header: 'Notas', key: 'notes', width: 30 }
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0440A5' } // Nouvie blue
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25

    // Add data rows
    for (const order of orders) {
      // Build products summary
      const productsSummary = order.items
        .map(item => `${item.quantity}x ${item.product.name}`)
        .join(', ')

      worksheet.addRow({
        orderNumber: order.orderNumber,
        orderDate: new Date(order.orderDate),
        customerName: order.customer.name,
        customerCedula: order.customer.cedula,
        customerPhone: order.customer.phone || '',
        products: productsSummary,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        paymentMethod: paymentMethodLabels[order.paymentMethod] || order.paymentMethod,
        paymentStatus: paymentStatusLabels[order.paymentStatus] || order.paymentStatus,
        shippingStatus: shippingStatusLabels[order.shippingStatus] || order.shippingStatus,
        invoiceNumber: order.invoiceNumber || '',
        notes: order.notes || ''
      })
    }

    // Format date column
    worksheet.getColumn('orderDate').numFmt = 'DD/MM/YYYY'

    // Format currency columns
    const currencyFormat = '"$"#,##0'
    worksheet.getColumn('subtotal').numFmt = currencyFormat
    worksheet.getColumn('tax').numFmt = currencyFormat
    worksheet.getColumn('total').numFmt = currencyFormat

    // Add borders to all cells with data
    const lastRow = worksheet.rowCount
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= 14; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        }
      }
    }

    // Alternate row colors for better readability
    for (let row = 2; row <= lastRow; row++) {
      if (row % 2 === 0) {
        const dataRow = worksheet.getRow(row)
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' } // Light gray
        }
      }
    }

    // Add summary row at the bottom
    if (orders.length > 0) {
      worksheet.addRow({}) // Empty row for spacing
      
      const summaryRow = worksheet.addRow({
        orderNumber: `Total: ${orders.length} pedido${orders.length !== 1 ? 's' : ''}`,
        subtotal: orders.reduce((sum, o) => sum + Number(o.subtotal), 0),
        tax: orders.reduce((sum, o) => sum + Number(o.tax), 0),
        total: orders.reduce((sum, o) => sum + Number(o.total), 0)
      })
      
      summaryRow.font = { bold: true }
      summaryRow.getCell('subtotal').numFmt = currencyFormat
      summaryRow.getCell('tax').numFmt = currencyFormat
      summaryRow.getCell('total').numFmt = currencyFormat
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Generate filename with date range
    let filename = 'pedidos-nouvie'
    if (fromParam && toParam) {
      filename += `-${fromParam}-a-${toParam}`
    } else if (fromParam) {
      filename += `-desde-${fromParam}`
    } else if (toParam) {
      filename += `-hasta-${toParam}`
    } else {
      filename += `-todos`
    }
    filename += '.xlsx'

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error exporting orders:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Error al exportar pedidos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}