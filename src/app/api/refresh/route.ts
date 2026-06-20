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
    // CRON_SECRET dogrulama
    const authHeader = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    const isAuthorized = expectedSecret ? authHeader === expectedSecret : true

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized - invalid or missing x-cron-secret header' }, { status: 401 })
    }

    // Hangi platform? (optional)
    const body = await request.json().catch(() => ({}))
    const platform = body.platform as string | undefined

    let results
    if (platform && ['gumroad', 'udemy', 'capafy'].includes(platform)) {
      results = [await refreshPlatform(platform as 'gumroad' | 'udemy' | 'capafy')]
    } else {
      results = await refreshAllPlatforms()
    }

    const allSuccess = results.every(r => r.status === 'success')

    return NextResponse.json({
      status: allSuccess ? 'success' : 'partial',
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
