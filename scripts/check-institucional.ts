import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    where: { category: 'Institucional' },
    orderBy: { name: 'asc' },
    select: { name: true, active: true, stock: true, price: true }
  })
  for (const p of products) {
    const status = p.active ? 'ACTIVE' : 'INACTIVE'
    console.log(`[${status}] ${p.name} | stock: ${p.stock} | price: ${Number(p.price)}`)
  }
  const active = products.filter(p => p.active)
  const inactive = products.filter(p => p.active === false)
  console.log(`\nActive: ${active.length}`)
  console.log(`Inactive: ${inactive.length}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
