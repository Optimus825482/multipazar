import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    const where = platform ? { platform } : undefined

    const trends = await db.searchTrend.findMany({
      where,
      orderBy: [{ keyword: 'asc' }, { month: 'asc' }],
    })

    // Group by keyword
    const grouped: Record<string, { keyword: string; data: { month: string; volume: number }[] }> = {}
    for (const t of trends) {
      if (!grouped[t.keyword]) {
        grouped[t.keyword] = { keyword: t.keyword, data: [] }
      }
      grouped[t.keyword].data.push({ month: t.month, volume: t.volume })
    }

    // Calculate growth rates - NaN guard ile
    const trendAnalysis = Object.values(grouped).map((g) => {
      // Sifira bolmeyi onle: ilk deger 0 ise 1 kullan
      const first = g.data[0]?.volume || 1
      const last = g.data[g.data.length - 1]?.volume || 1
      const growthRate = Math.round(((last - first) / first) * 100 * 10) / 10
      const volumes = g.data.map((d) => d.volume)
      const avgVolume = volumes.length > 0
        ? Math.round(volumes.reduce((s, d) => s + d, 0) / volumes.length)
        : 0
      return {
        ...g,
        growthRate,
        avgVolume,
      }
    })

    trendAnalysis.sort((a, b) => b.growthRate - a.growthRate)

    return NextResponse.json(trendAnalysis)
  } catch (error) {
    console.error('Trends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
