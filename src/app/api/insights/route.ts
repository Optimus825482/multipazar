import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    // Platform filtresi eklendi (diger route'larla tutarlilik)
    const where = platform ? { platform } : undefined

    const insights = await db.marketInsight.findMany({
      where,
      orderBy: { impactScore: 'desc' },
    })

    return NextResponse.json(insights)
  } catch (error) {
    console.error('Insights API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
