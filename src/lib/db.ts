import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  // SQLite icin WAL (Write-Ahead Logging) modunu ac.
  // WAL, es zamanli okuma/yazma saglar ve SQLITE_BUSY kilitlenmelerini azaltir.
  // Birden fazla refresh paralel calisirken cakismayi onler.
  if (process.env.DATABASE_URL?.includes('file:') || process.env.DATABASE_URL?.includes('.db')) {
    client.$queryRawUnsafe('PRAGMA journal_mode = WAL;').catch((err) => {
      console.error('[DB] WAL modu ayarlanamadi:', err)
    })
    // Normal modda da daha iyi concurrency icin busy_timeout
    client.$queryRawUnsafe('PRAGMA busy_timeout = 5000;').catch(() => {
      // busy_timeout desteklenmeyebilir, sessizce gec
    })
  }

  return client
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
