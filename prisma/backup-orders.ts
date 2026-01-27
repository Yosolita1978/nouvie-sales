import { PrismaClient } from '@prisma/client'
import Papa from 'papaparse'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Structure for the CSV export
interface OrderBackupRow {
  orderNumber: string
  orderDate: string
  customerName: string
  customerCedula: string
  productsSummary: string
  subtotal: string
  tax: string
  total: string
  paymentMethod: string
  paymentStatus: string
  shippingStatus: string
  notes: string
}

async function backupOrders() {
  console.log('📦 Starting orders backup...\n')

  // ----------------------------------------
  // STEP 1: Query all orders with relations
  // ----------------------------------------
  console.log('🔍 Querying orders from database...')

  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: {
      orderDate: 'asc'
    }
  })

  console.log(`   Found ${orders.length} orders\n`)

  if (orders.length === 0) {
    console.log('⚠️  No orders to backup. Exiting.')
    return
  }

  // ----------------------------------------
  // STEP 2: Transform to flat CSV structure
  // ----------------------------------------
  console.log('🔄 Transforming data for CSV...')

  const rows: OrderBackupRow[] = orders.map(order => {
    // Build products summary: "Product A (x2); Product B (x1)"
    const productsSummary = order.items
      .map(item => `${item.product.name} (x${item.quantity})`)
      .join('; ')

    return {
      orderNumber: order.orderNumber,
      orderDate: order.orderDate.toISOString(),
      customerName: order.customer.name,
      customerCedula: order.customer.cedula,
      productsSummary: productsSummary,
      subtotal: order.subtotal.toString(),
      tax: order.tax.toString(),
      total: order.total.toString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      notes: order.notes || ''
    }
  })

  // ----------------------------------------
  // STEP 3: Generate CSV content
  // ----------------------------------------
  console.log('📝 Generating CSV...')

  const csv = Papa.unparse(rows, {
    header: true,
    quotes: true  // Quote all fields for safety
  })

  // ----------------------------------------
  // STEP 4: Ensure backups directory exists
  // ----------------------------------------
  const backupsDir = path.join(__dirname, 'backups')

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
    console.log('   Created backups directory')
  }

  // ----------------------------------------
  // STEP 5: Write CSV file with timestamp
  // ----------------------------------------
  const timestamp = new Date().toISOString().split('T')[0]  // YYYY-MM-DD
  const filename = `orders-backup-${timestamp}.csv`
  const filePath = path.join(backupsDir, filename)

  fs.writeFileSync(filePath, csv, 'utf-8')

  console.log(`\n✅ Backup completed successfully!`)
  console.log(`📁 File: ${filePath}`)
  console.log(`📊 Orders backed up: ${orders.length}`)

  // Show preview of first order
  if (rows.length > 0) {
    console.log('\n📋 Preview (first order):')
    console.log(`   Order: ${rows[0].orderNumber}`)
    console.log(`   Customer: ${rows[0].customerName}`)
    console.log(`   Total: $${rows[0].total}`)
  }
}

// Run the backup
backupOrders()
  .catch((e) => {
    console.error('\n❌ BACKUP FAILED!')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
