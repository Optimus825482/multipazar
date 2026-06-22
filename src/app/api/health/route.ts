import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCacheStats } from '@/lib/cache'

/**
 * Health check & readiness endpoint.
 *
 * - 200: Sistem saglikli (DB baglantisi OK)
 * - 503: DB baglantisi yok, kuyruk yogun, vs.
 *
 * Container orchestration (Docker/K8s) ve monitoring araclari icin kritik.
 */
export async function GET() {
  const startedAt = Date.now()

  // DB kontrolu
  let dbOk = false
  let dbLatencyMs = 0
  let lastRefresh: Date | null = null
  let categoryCount = 0
  let productCount = 0
  try {
    const t0 = Date.now()
    // Basit bir sorgu - DB baglantisini test et
    await db.$queryRawUnsafe('SELECT 1')
    dbLatencyMs = Date.now() - t0
    dbOk = true

    // Son basarili yenileme
    const last = await db.refreshLog.findFirst({
      where: { status: 'success' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    lastRefresh = last?.createdAt || null

    // Veri envanteri
    categoryCount = await db.category.count()
    productCount = await db.product.count()
  } catch (err) {
    console.error('[Health] DB kontrolu basarisiz:', err)
  }

  // Cache durumu
  const cacheStats = getCacheStats()

  const uptimeMs = Date.now() - startedAt
  const status = dbOk ? 'ok' : 'degraded'
  const httpStatus = dbOk ? 200 : 503

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: {
        connected: dbOk,
        latencyMs: dbLatencyMs,
        lastRefresh: lastRefresh?.toISOString() || null,
        categoryCount,
        productCount,
      },
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys,
      },
      node: {
        version: process.version,
        env: process.env.NODE_ENV || 'development',
      },
    },
    { status: httpStatus }
  )
}
