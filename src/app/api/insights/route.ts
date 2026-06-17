import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const insights = await db.marketInsight.findMany({
      orderBy: { impactScore: 'desc' },
    })

    return NextResponse.json(insights)
  } catch (error) {
    console.error('Insights API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
