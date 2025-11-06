import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
function getDatabaseUrlWithPoolSettings(): string {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const normalizedUrl = databaseUrl.replace(/^postgres:\/\//, 'postgresql://');
    const url = new URL(normalizedUrl);
    
    if (url.searchParams.has('connection_limit') || 
        url.searchParams.has('pool_timeout') || 
        url.searchParams.has('connect_timeout')) {
      return databaseUrl;
    }

    url.searchParams.set('connection_limit', process.env.DATABASE_POOL_SIZE || '10');
    url.searchParams.set('pool_timeout', process.env.DATABASE_POOL_TIMEOUT || '20');
    url.searchParams.set('connect_timeout', process.env.DATABASE_CONNECT_TIMEOUT || '10');

    let finalUrl = url.toString();
    if (databaseUrl.startsWith('postgres://') && !finalUrl.startsWith('postgres://')) {
      finalUrl = finalUrl.replace(/^postgresql:\/\//, 'postgres://');
    }

    return finalUrl;
  } catch (error) {
    console.warn('Failed to parse DATABASE_URL for pool settings:', error);
    return databaseUrl;
  }
}

const createPrismaClient = () => {
  const databaseUrl = getDatabaseUrlWithPoolSettings();
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: databaseUrl,
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

if (typeof process !== 'undefined' && process.on) {
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
}