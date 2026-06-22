import { NextResponse } from 'next/server'
import { refreshAllPlatforms, refreshPlatform, getLastRefreshTimestamp } from '@/lib/refresh'
import { verifyCronSecret } from '@/lib/auth'
import { db } from '@/lib/db'

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (!origin || !host) {
    return false
  }

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function GET() {
  try {
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
      supportedPlatforms: ['gumroad', 'udemy', 'capafy'],
    })
  } catch (error) {
    console.error('Refresh GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // GUVENLIK: Dis cron/API cagrilarinda x-cron-secret zorunludur.
    // Uygulamanin kendi UI'indan gelen manuel refresh ayni-origin ise kabul edilir;
    // secret client tarafina gonderilmez.
    const authHeader = request.headers.get('x-cron-secret')
    if (!verifyCronSecret(authHeader) && !isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized - valid x-cron-secret header required' }, { status: 401 })
    }

    // Hangi platform? (optional)
    const body = await request.json().catch(() => ({}))
    const requestedPlatform = body.platform as string | undefined
    const platform = requestedPlatform && ['gumroad', 'udemy', 'capafy'].includes(requestedPlatform)
      ? requestedPlatform as 'gumroad' | 'udemy' | 'capafy'
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
