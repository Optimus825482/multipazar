import { NextResponse } from 'next/server'
import { getPlatformDataFromDB, buildTrendDataFromDB } from '@/data/helpers'
import { GUMROAD_PRODUCT_IDEAS, GUMROAD_DATA_SOURCES } from '@/data/gumroad/product-ideas'
import { db } from '@/lib/db'
import { cachedFetch, setCached } from '@/lib/cache'

const CACHE_DURATION = 5 * 60 * 1000 // 5 dakika cache

export async function GET() {
  try {
    const cached = cachedFetch('market-data-db')
    if (cached) return NextResponse.json(cached)

    const {
      categories,
      products,
      insights,
      trends: dbTrends,
      productIdeas: dbProductIdeas,
    } = await getPlatformDataFromDB('gumroad')

    // Eger DB bos ise henuz refresh yapilmamis demektir -> seed verisi gonder
    if (categories.length === 0) {
      return NextResponse.json({
        overview: {
          totalRevenue: 0,
          totalProducts: 0,
          totalSearchVolume: 0,
          avgGrowthRate: 0,
          totalCategories: 0,
          dataSources: GUMROAD_DATA_SOURCES,
        },
        categories: [],
        topCategories: [],
        fastestGrowing: [],
        lowestCompetition: [],
        topProducts: [],
        trendingProducts: [],
        products: [],
        opportunities: {
          categories: [],
          productIdeas: GUMROAD_PRODUCT_IDEAS,
          summary: { totalOpportunities: 0, avgGapScore: 0, topCategoryGaps: [] },
        },
        insights: [],
        trends: [],
        lastUpdated: new Date().toISOString(),
      })
    }

    const totalRevenue = categories.reduce((s: number, c: any) => s + c.totalRevenue, 0)
    const totalProducts = categories.reduce((s: number, c: any) => s + c.totalProducts, 0)
    const totalSearchVolume = categories.reduce((s: number, c: any) => s + c.searchVolume, 0)
    const avgGrowthRate = categories.reduce((s: number, c: any) => s + c.growthRate, 0) / categories.length

    const topCategories = [...categories].sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).slice(0, 5)
    const fastestGrowing = [...categories].sort((a: any, b: any) => b.growthRate - a.growthRate).slice(0, 5)
    const lowestCompetition = [...categories].sort((a: any, b: any) => a.competitionIndex - b.competitionIndex).slice(0, 5)
    const topProducts = [...products].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10)
    const trendingProducts = products.filter((p: any) => p.isTrending).sort((a: any, b: any) => b.opportunityScore - a.opportunityScore).slice(0, 8)

    const categoryOpportunities = categories
      .filter((c: any) => c.demandScore >= 8.0 && c.supplyScore <= 5.5)
      .sort((a: any, b: any) => b.growthRate - a.growthRate)
      .map((c: any) => ({
        ...c,
        gapScore: Math.round((c.demandScore - c.supplyScore) * 10) / 10,
        estimatedMonthlyDemand: Math.round(c.searchVolume * 0.12),
        estimatedMonthlySupply: Math.round(c.totalProducts * 0.08),
        unmetDemand: Math.round(c.searchVolume * 0.12 - c.totalProducts * 0.08),
      }))

    // En son yenileme zamanini al
    const lastRefreshLog = await db.refreshLog.findFirst({
      where: { platform: 'all', status: 'success' },
      orderBy: { createdAt: 'desc' },
    })

    const trends = buildTrendDataFromDB(dbTrends)

    const result = {
      overview: {
        totalRevenue,
        totalProducts,
        totalSearchVolume,
        avgGrowthRate,
        totalCategories: categories.length,
        dataSources: GUMROAD_DATA_SOURCES,
      },
      categories,
      topCategories,
      fastestGrowing,
      lowestCompetition,
      topProducts,
      trendingProducts,
      products,
      opportunities: {
        categories: categoryOpportunities,
        productIdeas: dbProductIdeas.length > 0 ? dbProductIdeas : GUMROAD_PRODUCT_IDEAS,
        summary: {
          totalOpportunities: categoryOpportunities.length,
          avgGapScore: categoryOpportunities.length > 0
            ? Math.round(categoryOpportunities.reduce((s: number, c: any) => s + c.gapScore, 0) / categoryOpportunities.length * 10) / 10
            : 0,
          topCategoryGaps: categoryOpportunities.slice(0, 3).map((c: any) => ({ name: c.name, gap: c.gapScore })),
        },
      },
      insights,
      trends,
      lastUpdated: lastRefreshLog?.createdAt?.toISOString() || new Date().toISOString(),
    }

    setCached('market-data-db', result, CACHE_DURATION)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Market API] Detayli hata:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
