import { NextResponse } from 'next/server'
import { refreshAllPlatforms, refreshPlatform, getLastRefreshTimestamp } from '@/lib/refresh'

export async function GET() {
  try {
    const lastRefresh = await getLastRefreshTimestamp()
    return NextResponse.json({
      status: 'ok',
      lastRefresh: lastRefresh?.createdAt?.toISOString() || null,
      cronSchedule: '0 */6 * * * (her 6 saatte bir)',
      supportedPlatforms: ['gumroad', 'udemy', 'capafy'],
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // CRON_SECRET dogrulama (opsiyonel - sadece header gonderilmisse kontrol et)
    const authHeader = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    const isAuthorized = !authHeader || (expectedSecret ? authHeader === expectedSecret : true)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized - invalid or missing x-cron-secret header' }, { status: 401 })
    }

    // Hangi platform? (optional)
    const body = await request.json().catch(() => ({}))
    const platform = body.platform as string | undefined

    // Hemen cevap don - islem arka planda devam etsin
    // Cloudflare 524 timeout'u onlemek icin
    const response = NextResponse.json({
      status: 'started',
      message: 'Veri yenileme basladi. Sonuclar bir sure sonra kullanilabilir olacak.',
      timestamp: new Date().toISOString(),
    })

    // Islemi arka planda baslat (fire-and-forget)
    if (platform && ['gumroad', 'udemy', 'capafy'].includes(platform)) {
      refreshPlatform(platform as 'gumroad' | 'udemy' | 'capafy').catch((err) =>
        console.error('Background refresh hatasi:', err)
      )
    } else {
      refreshAllPlatforms().catch((err) =>
        console.error('Background refresh hatasi:', err)
      )
    }

    return response
  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
