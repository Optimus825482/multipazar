import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Find products with high demand but low supply (opportunities)
    const opportunities = await db.product.findMany({
      where: {
        demandScore: { gte: 8.0 },
        supplyScore: { lte: 4.0 },
      },
      include: { category: true },
      orderBy: { opportunityScore: 'desc' },
    })

    // Categories with high demand/low supply
    const categoryOpportunities = await db.category.findMany({
      where: {
        demandScore: { gte: 8.0 },
        supplyScore: { lte: 5.0 },
      },
      orderBy: { growthRate: 'desc' },
    })

    // Calculate opportunity gap
    const opportunityGaps = categoryOpportunities.map((c) => ({
      ...c,
      gapScore: Math.round((c.demandScore - c.supplyScore) * 10) / 10,
      estimatedMonthlyDemand: Math.round(c.searchVolume * 0.12),
      estimatedMonthlySupply: Math.round(c.totalProducts * 0.08),
      unmetDemand: Math.round(c.searchVolume * 0.12 - c.totalProducts * 0.08),
    }))

    return NextResponse.json({
      products: opportunities,
      categories: opportunityGaps,
      productIdeas: [],
      summary: {
        totalOpportunities: opportunities.length,
        avgGapScore: opportunityGaps.length > 0
          ? Math.round(opportunityGaps.reduce((s, c) => s + c.gapScore, 0) / opportunityGaps.length * 10) / 10
          : 0,
        topCategoryGaps: opportunityGaps.slice(0, 3).map((c) => ({ name: c.name, gap: c.gapScore })),
      },
    })
  } catch (error) {
    console.error('Opportunities API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
