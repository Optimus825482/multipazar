import { NextResponse } from 'next/server'
import { refreshAllPlatforms, refreshPlatform, getLastRefreshTimestamp } from '@/lib/refresh'
import { verifyCronSecret } from '@/lib/auth'
import { db } from '@/lib/db'
import { clearCache } from '@/lib/cache'

/**
 * Allowed platform degerleri (Udemy kaldirildi - ToS riski).
 */
const ALLOWED_PLATFORMS = ['gumroad', 'capafy'] as const
type AllowedPlatform = typeof ALLOWED_PLATFORMS[number]

function isAllowedPlatform(value: unknown): value is AllowedPlatform {
  return typeof value === 'string' && (ALLOWED_PLATFORMS as readonly string[]).includes(value)
}

function getAllowedOrigins(): string[] {
  // NEXT_PUBLIC_BASE_URL (ornek: http://localhost:3000, https://market.erkanerdem.online)
  // + localhost varyasyonlari (gelistirme)
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  const list = new Set<string>()

  if (base) {
    try {
      list.add(new URL(base).origin)
    } catch {
      // Hatali URL'i yoksay, logla
      console.warn('[Refresh] NEXT_PUBLIC_BASE_URL gecersiz:', base)
    }
  }

  // Gelistirme icin localhost varyasyonlari
  if (process.env.NODE_ENV !== 'production') {
    list.add('http://localhost:3000')
    list.add('http://127.0.0.1:3000')
  }

  return Array.from(list)
}

/**
 * GUVENLIK: Origin header allowlist ile dogrulama.
 * Onceki same-origin kontrolu spoofing'e acikti (browser disindan Origin header
 * taklit edilebilir). Simdi sadece tanimli originlere izin veriliyor.
 */
function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false

  const allowed = getAllowedOrigins()
  if (allowed.length === 0) return false

  return allowed.includes(origin)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    // jobId bazli polling (H6/E9 - refresh tamamlanmasini UI'a bildir)
    if (jobId) {
      const job = await db.refreshJob.findUnique({ where: { id: jobId } })
      if (!job) {
        return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 })
      }

      let results: { platform: string; status: string; message?: string }[] = []
      if (job.status !== 'running') {
        if (job.platform === 'all') {
          const logs = await db.refreshLog.findMany({
            where: {
              createdAt: { gte: job.startedAt },
              platform: { in: [...ALLOWED_PLATFORMS] },
              status: { in: ['success', 'error'] },
            },
            orderBy: { createdAt: 'desc' },
            take: ALLOWED_PLATFORMS.length,
          })
          results = logs.map((l) => ({ platform: l.platform, status: l.status, message: l.message || undefined }))
        } else {
          const log = await db.refreshLog.findFirst({
            where: { platform: job.platform, createdAt: { gte: job.startedAt } },
            orderBy: { createdAt: 'desc' },
          })
          if (log) {
            results = [{ platform: log.platform, status: log.status, message: log.message || undefined }]
          }
        }
      }

      return NextResponse.json({ job, results })
    }

    const [lastRefresh, activeJob, lastJob] = await Promise.all([
      getLastRefreshTimestamp(),
      db.refreshJob.findFirst({
        where: { status: 'running' },
        orderBy: { startedAt: 'desc' },
      }),
      db.refreshJob.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      status: 'ok',
      lastRefresh: lastRefresh?.createdAt?.toISOString() || null,
      activeJob,
      lastJob,
      cronSchedule: '0 */6 * * * (her 6 saatte bir)',
      supportedPlatforms: ALLOWED_PLATFORMS,
    })
  } catch (error) {
    console.error('Refresh GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // GUVENLIK 1: Dis cron/API cagrilari icin x-cron-secret zorunlu.
    // GUVENLIK 2: Ayni origin bile olsa Origin header allowlist'te olmali.
    // Onceki same-origin kontrolu Origin header spoofing'e acikti.
    const authHeader = request.headers.get('x-cron-secret')
    const hasValidSecret = verifyCronSecret(authHeader)
    const trustedOrigin = isTrustedOrigin(request)

    if (!hasValidSecret && !trustedOrigin) {
      return NextResponse.json(
        { error: 'Unauthorized - valid x-cron-secret header or trusted origin required' },
        { status: 401 }
      )
    }

    // Hangi platform? (optional)
    const body = await request.json().catch(() => ({}))
    const requestedPlatform = body.platform
    const platform: AllowedPlatform | undefined = isAllowedPlatform(requestedPlatform)
      ? requestedPlatform
      : undefined

    const activeJob = await db.refreshJob.findFirst({
      where: { status: 'running' },
      orderBy: { startedAt: 'desc' },
    })

    if (activeJob) {
      return NextResponse.json({
        error: 'Refresh already running',
        job: activeJob,
      }, { status: 409 })
    }

    const job = await db.refreshJob.create({
      data: {
        platform: platform || 'all',
        status: 'running',
        message: 'Veri yenileme basladi',
      },
    })

    // Hemen cevap don - islem arka planda devam etsin
    // Cloudflare 524 timeout'u onlemek icin
    const response = NextResponse.json({
      status: 'started',
      jobId: job.id,
      message: 'Veri yenileme basladi. Sonuclar bir sure sonra kullanilabilir olacak.',
      timestamp: new Date().toISOString(),
    })

    const startedAt = Date.now()
    const refreshPromise = platform ? refreshPlatform(platform) : refreshAllPlatforms()
    refreshPromise
      .then(async (result) => {
        const results = Array.isArray(result) ? result : [result]
        const failed = results.filter((r) => r.status === 'error')
        // Cache'i temizle - yeni veriler yansisin
        clearCache()
        await db.refreshJob.update({
          where: { id: job.id },
          data: {
            status: failed.length > 0 ? 'error' : 'success',
            message: failed.length > 0
              ? `Hata alan platformlar: ${failed.map((r) => r.platform).join(', ')}`
              : 'Veri yenileme tamamlandi',
            finishedAt: new Date(),
            duration: Date.now() - startedAt,
          },
        })
      })
      .catch(async (err) => {
        console.error('Background refresh hatasi:', err)
        clearCache()
        await db.refreshJob.update({
          where: { id: job.id },
          data: {
            status: 'error',
            message: err instanceof Error ? err.message : 'Bilinmeyen refresh hatasi',
            finishedAt: new Date(),
            duration: Date.now() - startedAt,
          },
        }).catch((updateErr) => console.error('Refresh job guncellenemedi:', updateErr))
      })

    return response
  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
