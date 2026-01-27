import { PrismaClient } from '@prisma/client'
import readline from 'readline'

const prisma = new PrismaClient()

async function confirmReset(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('\n⚠️  This will DELETE all orders, customers, and products. Continue? (yes/no): ', (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes')
    })
  })
}

async function resetDatabase() {
  console.log('🗑️  Database Reset Script\n')
  console.log('='.repeat(50))

  // ----------------------------------------
  // STEP 1: Show current counts
  // ----------------------------------------
  console.log('\n📊 Current data in database:')

  const orderItemCount = await prisma.orderItem.count()
  const orderCount = await prisma.order.count()
  const customerCount = await prisma.customer.count()
  const productCount = await prisma.product.count()
  const userCount = await prisma.user.count()

  console.log(`   Order Items: ${orderItemCount}`)
  console.log(`   Orders: ${orderCount}`)
  console.log(`   Customers: ${customerCount}`)
  console.log(`   Products: ${productCount}`)
  console.log(`   Users: ${userCount} (will NOT be deleted)`)

  // ----------------------------------------
  // STEP 2: Confirm with user
  // ----------------------------------------
  const confirmed = await confirmReset()

  if (!confirmed) {
    console.log('\n❌ Reset cancelled.')
    return
  }

  console.log('\n🔄 Starting reset...\n')

  // ----------------------------------------
  // STEP 3: Delete in correct FK order
  // ----------------------------------------
  // Using a transaction to ensure atomicity

  await prisma.$transaction(async (tx) => {
    // Delete order_items first (references orders and products)
    console.log('1️⃣  Deleting order items...')
    const deletedItems = await tx.orderItem.deleteMany()
    console.log(`   ✅ Deleted ${deletedItems.count} order items`)

    // Delete orders second (references customers)
    console.log('2️⃣  Deleting orders...')
    const deletedOrders = await tx.order.deleteMany()
    console.log(`   ✅ Deleted ${deletedOrders.count} orders`)

    // Delete customers third (now safe)
    console.log('3️⃣  Deleting customers...')
    const deletedCustomers = await tx.customer.deleteMany()
    console.log(`   ✅ Deleted ${deletedCustomers.count} customers`)

    // Delete products fourth (now safe)
    console.log('4️⃣  Deleting products...')
    const deletedProducts = await tx.product.deleteMany()
    console.log(`   ✅ Deleted ${deletedProducts.count} products`)
  })

  // ----------------------------------------
  // STEP 4: Verify deletion
  // ----------------------------------------
  console.log('\n📊 Verifying reset...')

  const finalOrderItems = await prisma.orderItem.count()
  const finalOrders = await prisma.order.count()
  const finalCustomers = await prisma.customer.count()
  const finalProducts = await prisma.product.count()
  const finalUsers = await prisma.user.count()

  console.log(`   Order Items: ${finalOrderItems}`)
  console.log(`   Orders: ${finalOrders}`)
  console.log(`   Customers: ${finalCustomers}`)
  console.log(`   Products: ${finalProducts}`)
  console.log(`   Users: ${finalUsers} (preserved)`)

  console.log('\n' + '='.repeat(50))
  console.log('✅ DATABASE RESET COMPLETE!')
  console.log('='.repeat(50))
  console.log('\nNext steps:')
  console.log('1. Place new CSV/Excel files in prisma/data/')
  console.log('2. Run: npm run seed')
}

// Run the reset
resetDatabase()
  .catch((e) => {
    console.error('\n❌ RESET FAILED!')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
