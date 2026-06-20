import { NextResponse } from 'next/server'
import { getPlatformDataFromDB, buildTrendDataFromDB } from '@/data/helpers'
import { UDEMY_PRODUCT_IDEAS, UDEMY_DATA_SOURCES } from '@/data/udemy/product-ideas'
import { db } from '@/lib/db'

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

function getCached(key: string) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) return entry.data
  return null
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

const globalCache = globalThis as unknown as { refreshCache?: Map<string, { data: unknown; timestamp: number }> }
if (!globalCache.refreshCache) globalCache.refreshCache = cache as any

export async function GET() {
  try {
    const cached = getCached('udemy-data-db')
    if (cached) return NextResponse.json(cached)

    const {
      categories,
      products: courses,
      insights,
      trends: dbTrends,
      productIdeas: dbProductIdeas,
    } = await getPlatformDataFromDB('udemy')

    if (categories.length === 0) {
      return NextResponse.json({
        overview: { totalRevenue: 0, totalCourses: 0, totalStudents: 0, totalSearchVolume: 0, avgGrowthRate: 0, totalCategories: 0, avgPrice: 0, dataSources: UDEMY_DATA_SOURCES },
        categories: [], topCategories: [], fastestGrowing: [], lowestCompetition: [],
        topCourses: [], trendingCourses: [], courses: [],
        opportunities: { categories: [], productIdeas: UDEMY_PRODUCT_IDEAS, summary: { totalOpportunities: 0, avgGapScore: 0, topCategoryGaps: [] } },
        insights: [], trends: [], lastUpdated: new Date().toISOString(),
      })
    }

    const totalRevenue = categories.reduce((s: number, c: any) => s + c.totalRevenue, 0)
    const totalCourses = categories.reduce((s: number, c: any) => s + c.totalProducts, 0)
    const totalStudents = categories.reduce((s: number, c: any) => s + (c.totalStudents || 0), 0)
    const totalSearchVolume = categories.reduce((s: number, c: any) => s + c.searchVolume, 0)
    const avgGrowthRate = categories.reduce((s: number, c: any) => s + c.growthRate, 0) / categories.length
    const avgPrice = Math.round(categories.reduce((s: number, c: any) => s + c.avgPrice, 0) / categories.length)

    const topCategories = [...categories].sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).slice(0, 5)
    const fastestGrowing = [...categories].sort((a: any, b: any) => b.growthRate - a.growthRate).slice(0, 5)
    const lowestCompetition = [...categories].sort((a: any, b: any) => a.competitionIndex - b.competitionIndex).slice(0, 5)
    const topCourses = [...courses].sort((a: any, b: any) => (b.studentCount || 0) - (a.studentCount || 0)).slice(0, 10)
    const trendingCourses = courses.filter((c: any) => c.isTrending).sort((a: any, b: any) => b.opportunityScore - a.opportunityScore).slice(0, 8)

    const categoryOpportunities = categories
      .filter((c: any) => c.demandScore >= 8.0 && c.supplyScore <= 6.5)
      .sort((a: any, b: any) => b.growthRate - a.growthRate)
      .map((c: any) => ({
        ...c,
        gapScore: Math.round((c.demandScore - c.supplyScore) * 10) / 10,
        estimatedMonthlyDemand: Math.round(c.searchVolume * 0.008),
        estimatedMonthlySupply: Math.round(c.totalProducts * 0.02),
        unmetDemand: Math.round(c.searchVolume * 0.008 - c.totalProducts * 0.02),
      }))

    const lastRefreshLog = await db.refreshLog.findFirst({
      where: { platform: 'all', status: 'success' },
      orderBy: { createdAt: 'desc' },
    })

    const trends = buildTrendDataFromDB(dbTrends)

    const result = {
      overview: {
        totalRevenue, totalCourses, totalStudents, totalSearchVolume, avgGrowthRate,
        totalCategories: categories.length, avgPrice, dataSources: UDEMY_DATA_SOURCES,
      },
      categories, topCategories, fastestGrowing, lowestCompetition,
      topCourses, trendingCourses, courses,
      opportunities: {
        categories: categoryOpportunities,
        productIdeas: dbProductIdeas.length > 0 ? dbProductIdeas : UDEMY_PRODUCT_IDEAS,
        summary: {
          totalOpportunities: categoryOpportunities.length,
          avgGapScore: categoryOpportunities.length > 0
            ? Math.round(categoryOpportunities.reduce((s: number, c: any) => s + c.gapScore, 0) / categoryOpportunities.length * 10) / 10
            : 0,
          topCategoryGaps: categoryOpportunities.slice(0, 3).map((c: any) => ({ name: c.name, gap: c.gapScore })),
        },
      },
      insights, trends,
      lastUpdated: lastRefreshLog?.createdAt?.toISOString() || new Date().toISOString(),
    }

    setCache('udemy-data-db', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Udemy API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
