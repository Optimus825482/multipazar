import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    const where = platform ? { platform } : undefined

    const categories = await db.category.findMany({
      where,
      orderBy: { totalRevenue: 'desc' },
    })

    // NaN guard: bos kategori listesi -> 0 degerler
    if (categories.length === 0) {
      return NextResponse.json({
        overview: {
          totalRevenue: 0,
          totalProducts: 0,
          totalSearchVolume: 0,
          avgGrowthRate: 0,
          totalCategories: 0,
        },
        topCategories: [],
        fastestGrowing: [],
        lowestCompetition: [],
        topProducts: [],
        trendingProducts: [],
      })
    }

    const totalRevenue = categories.reduce((sum, c) => sum + c.totalRevenue, 0)
    const totalProducts = categories.reduce((sum, c) => sum + c.totalProducts, 0)
    const totalSearchVolume = categories.reduce((sum, c) => sum + c.searchVolume, 0)
    const avgGrowthRate = categories.reduce((sum, c) => sum + c.growthRate, 0) / categories.length

    const topCategories = categories.slice(0, 5)
    const fastestGrowing = [...categories].sort((a, b) => b.growthRate - a.growthRate).slice(0, 5)
    const lowestCompetition = [...categories].sort((a, b) => a.competitionIndex - b.competitionIndex).slice(0, 5)

    const productWhere = platform ? { platform } : undefined
    const [allProducts, trendingProducts] = await Promise.all([
      db.product.findMany({
        where: productWhere,
        include: { category: true },
        orderBy: { revenue: 'desc' },
        take: 10,
      }),
      db.product.findMany({
        where: { ...productWhere, isTrending: true },
        include: { category: true },
        orderBy: { opportunityScore: 'desc' },
        take: 8,
      }),
    ])

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
