import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const prisma = process.env.NODE_ENV === 'development' 
  ? (globalForPrisma.prisma ?? createPrismaClient())
  : createPrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalForPrisma.prisma = prisma
}


// Graceful shutdown for Prisma client
const gracefulShutdown = async () => {
  console.log('Disconnecting Prisma client...')
  await prisma.$disconnect()
  console.log('Prisma client disconnected')
}

// Handle different exit signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  await gracefulShutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  await gracefulShutdown()
  process.exit(0)
})

process.on('beforeExit', async () => {
  console.log('Process is about to exit, disconnecting Prisma...')
  await gracefulShutdown()
})