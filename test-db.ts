import { prisma } from './lib/prisma'

async function main() {
  console.log('Testing database connection...')
  const users = await prisma.user.findMany()
  console.log('Connected! Users count:', users.length)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())