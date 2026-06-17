import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { totalRevenue: 'desc' },
    })

    const totalRevenue = categories.reduce((sum, c) => sum + c.totalRevenue, 0)
    const totalProducts = categories.reduce((sum, c) => sum + c.totalProducts, 0)
    const totalSearchVolume = categories.reduce((sum, c) => sum + c.searchVolume, 0)

    const avgGrowthRate = categories.reduce((sum, c) => sum + c.growthRate, 0) / categories.length

    const topCategories = categories.slice(0, 5)
    const fastestGrowing = [...categories].sort((a, b) => b.growthRate - a.growthRate).slice(0, 5)
    const lowestCompetition = [...categories].sort((a, b) => a.competitionIndex - b.competitionIndex).slice(0, 5)

    const allProducts = await db.product.findMany({
      include: { category: true },
      orderBy: { revenue: 'desc' },
      take: 10,
    })

    const trendingProducts = await db.product.findMany({
      where: { isTrending: true },
      include: { category: true },
      orderBy: { opportunityScore: 'desc' },
      take: 8,
    })

    return NextResponse.json({
      overview: {
        totalRevenue,
        totalProducts,
        totalSearchVolume,
        avgGrowthRate,
        totalCategories: categories.length,
      },
      topCategories,
      fastestGrowing,
      lowestCompetition,
      topProducts: allProducts,
      trendingProducts,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
