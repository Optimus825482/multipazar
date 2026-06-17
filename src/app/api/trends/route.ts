import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const trends = await db.searchTrend.findMany({
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

    // Calculate growth rates
    const trendAnalysis = Object.values(grouped).map((g) => {
      const first = g.data[0]?.volume || 1
      const last = g.data[g.data.length - 1]?.volume || 1
      const growthRate = Math.round(((last - first) / first) * 100 * 10) / 10
      return {
        ...g,
        growthRate,
        avgVolume: Math.round(g.data.reduce((s, d) => s + d.volume, 0) / g.data.length),
      }
    })

    trendAnalysis.sort((a, b) => b.growthRate - a.growthRate)

    return NextResponse.json(trendAnalysis)
  } catch (error) {
    console.error('Trends API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
