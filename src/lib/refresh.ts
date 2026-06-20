import { db } from '@/lib/db'
import { GUMROAD_CATEGORIES } from '@/data/gumroad/categories'
import { GUMROAD_PRODUCTS } from '@/data/gumroad/products'
import { GUMROAD_INSIGHTS } from '@/data/gumroad/insights'
import { GUMROAD_PRODUCT_IDEAS } from '@/data/gumroad/product-ideas'
import { UDEMY_CATEGORIES } from '@/data/udemy/categories'
import { UDEMY_COURSES } from '@/data/udemy/products'
import { UDEMY_INSIGHTS } from '@/data/udemy/insights'
import { UDEMY_PRODUCT_IDEAS } from '@/data/udemy/product-ideas'
import { CAPAFY_CATEGORIES } from '@/data/capafy/categories'
import { CAPAFY_PRODUCTS } from '@/data/capafy/products'
import { CAPAFY_INSIGHTS } from '@/data/capafy/insights'
import { CAPAFY_PRODUCT_IDEAS } from '@/data/capafy/product-ideas'
import { getGumroadCategorySlug } from '@/data/gumroad/product-ideas'
import { getUdemyCategorySlug } from '@/data/udemy/product-ideas'
import { getCapafyCategorySlug } from '@/data/capafy/product-ideas'
import { calcOpportunityScore, generateTrendData } from '@/data/helpers'

type Platform = 'gumroad' | 'udemy' | 'capafy'
type RefreshResult = { platform: Platform; status: 'success' | 'error'; duration: number; message: string }

// In-memory cache for the API routes
const globalCache = globalThis as unknown as {
  refreshCache?: Map<string, { data: unknown; timestamp: number }>
}

function clearCache() {
  if (globalCache.refreshCache) {
    globalCache.refreshCache.clear()
  }
}

export async function refreshPlatform(platform: Platform): Promise<RefreshResult> {
  const start = Date.now()
  try {
    switch (platform) {
      case 'gumroad': await refreshGumroad(); break
      case 'udemy':   await refreshUdemy(); break
      case 'capafy':  await refreshCapafy(); break
    }

    await db.refreshLog.create({
      data: {
        platform,
        status: 'success',
        duration: Date.now() - start,
        message: `${platform} verileri basariyla guncellendi`,
      },
    })

    return {
      platform,
      status: 'success',
      duration: Date.now() - start,
      message: `${platform} verileri basariyla guncellendi`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Bilinmeyen hata'
    await db.refreshLog.create({
      data: {
        platform,
        status: 'error',
        duration: Date.now() - start,
        message: errorMsg,
      },
    })
    return {
      platform,
      status: 'error',
      duration: Date.now() - start,
      message: errorMsg,
    }
  }
}

export async function refreshAllPlatforms(): Promise<RefreshResult[]> {
  clearCache()
  const results = await Promise.all([
    refreshPlatform('gumroad'),
    refreshPlatform('udemy'),
    refreshPlatform('capafy'),
  ])

  // Log the "all" refresh
  const allSuccess = results.every(r => r.status === 'success')
  await db.refreshLog.create({
    data: {
      platform: 'all',
      status: allSuccess ? 'success' : 'error',
      duration: results.reduce((s, r) => s + r.duration, 0),
      message: allSuccess
        ? '3 platform da basariyla guncellendi'
        : `Bazi platformlarda hata: ${results.filter(r => r.status === 'error').map(r => r.platform).join(', ')}`,
    },
  })

  clearCache()
  return results
}

// ===================== GUMROAD REFRESH =====================
async function refreshGumroad() {
  const platform: Platform = 'gumroad'

  // 1. Clear old data (in transaction)
  await db.$transaction([
    db.productIdea.deleteMany({ where: { platform } }),
    db.searchTrend.deleteMany({ where: { platform } }),
    db.marketInsight.deleteMany({ where: { platform } }),
    db.product.deleteMany({ where: { platform } }),
    db.category.deleteMany({ where: { platform } }),
  ])

  // 2. Insert categories
  const categorySlugToId: Record<string, string> = {}
  for (const cat of GUMROAD_CATEGORIES) {
    const created = await db.category.create({
      data: {
        platform,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        avgPrice: cat.avgPrice,
        totalProducts: cat.totalProducts,
        totalRevenue: cat.totalRevenue,
        searchVolume: cat.searchVolume,
        demandScore: cat.demandScore,
        supplyScore: cat.supplyScore,
        competitionIndex: cat.competitionIndex,
        growthRate: cat.growthRate,
        trendDirection: cat.trendDirection,
        source: cat.source,
      },
    })
    categorySlugToId[cat.slug] = created.id
  }

  // 3. Insert products
  for (const prod of GUMROAD_PRODUCTS) {
    const catSlug = getGumroadCategorySlug(prod.name)
    const categoryId = categorySlugToId[catSlug] || categorySlugToId['software-development']!
    await db.product.create({
      data: {
        platform,
        name: prod.name,
        categoryId,
        price: prod.price,
        salesCount: prod.salesCount,
        revenue: Math.round(prod.price * prod.salesCount),
        rating: prod.rating,
        reviewCount: prod.reviewCount,
        searchVolume: prod.searchVolume || 0,
        demandScore: prod.demandScore,
        supplyScore: prod.supplyScore,
        opportunityScore: calcOpportunityScore(prod.demandScore, prod.supplyScore),
        tags: prod.tags,
        type: prod.type || 'other',
        avgMonthlySales: prod.avgMonthlySales || 0,
        priceRange: prod.priceRange || 'mid',
        isTrending: prod.isTrending,
        gumroadUrl: prod.gumroadUrl,
      },
    })
  }

  // 4. Insert insights
  for (const insight of GUMROAD_INSIGHTS) {
    await db.marketInsight.create({
      data: {
        platform,
        title: insight.title,
        description: insight.description,
        insightType: insight.insightType,
        impactScore: insight.impactScore,
        source: insight.source,
      },
    })
  }

  // 5. Insert search trends
  for (const cat of GUMROAD_CATEGORIES) {
    const trendData = generateTrendData(cat.slug, cat.growthRate, cat.searchVolume)
    for (const td of trendData) {
      await db.searchTrend.create({
        data: {
          platform,
          keyword: cat.slug,
          categorySlug: cat.slug,
          month: td.month,
          volume: td.volume,
          growthRate: cat.growthRate,
        },
      })
    }
  }

  // 6. Insert product ideas
  for (const idea of GUMROAD_PRODUCT_IDEAS) {
    await db.productIdea.create({
      data: {
        platform,
        name: idea.name,
        category: idea.category,
        estimatedPrice: idea.estimatedPrice,
        estimatedMonthlySales: idea.estimatedMonthlySales,
        estimatedMonthlyRevenue: idea.estimatedMonthlyRevenue,
        demandScore: idea.demandScore,
        supplyScore: idea.supplyScore,
        gapScore: idea.gapScore,
        difficulty: idea.difficulty,
        timeToCreate: idea.timeToCreate,
        reason: idea.reason,
        sourceUrl: idea.sourceUrl,
      },
    })
  }
}

// ===================== UDEMY REFRESH =====================
async function refreshUdemy() {
  const platform: Platform = 'udemy'

  await db.$transaction([
    db.productIdea.deleteMany({ where: { platform } }),
    db.searchTrend.deleteMany({ where: { platform } }),
    db.marketInsight.deleteMany({ where: { platform } }),
    db.product.deleteMany({ where: { platform } }),
    db.category.deleteMany({ where: { platform } }),
  ])

  const categorySlugToId: Record<string, string> = {}
  for (const cat of UDEMY_CATEGORIES) {
    const created = await db.category.create({
      data: {
        platform,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        avgPrice: cat.avgPrice,
        totalProducts: cat.totalProducts,
        totalRevenue: cat.totalRevenue,
        totalStudents: cat.totalStudents,
        searchVolume: cat.searchVolume,
        demandScore: cat.demandScore,
        supplyScore: cat.supplyScore,
        competitionIndex: cat.competitionIndex,
        growthRate: cat.growthRate,
        trendDirection: cat.trendDirection,
        avgRating: cat.avgRating,
        avgReviews: cat.avgReviews,
        source: cat.source,
      },
    })
    categorySlugToId[cat.slug] = created.id
  }

  for (const course of UDEMY_COURSES) {
    const catSlug = getUdemyCategorySlug(course.name)
    const categoryId = categorySlugToId[catSlug] || categorySlugToId['software-development']!
    await db.product.create({
      data: {
        platform,
        name: course.name,
        categoryId,
        price: course.price,
        studentCount: course.studentCount,
        salesCount: course.studentCount,
        revenue: Math.round(course.price * course.studentCount * 0.15),
        rating: course.rating,
        reviewCount: course.reviewCount,
        demandScore: course.demandScore,
        supplyScore: course.supplyScore,
        opportunityScore: calcOpportunityScore(course.demandScore, course.supplyScore),
        tags: course.tags,
        type: 'course',
        avgMonthlyEnroll: course.avgMonthlyEnroll || 0,
        priceRange: 'mid',
        isTrending: course.isTrending,
        instructor: course.instructor,
        url: course.url,
      },
    })
  }

  for (const insight of UDEMY_INSIGHTS) {
    await db.marketInsight.create({
      data: { platform, title: insight.title, description: insight.description, insightType: insight.insightType, impactScore: insight.impactScore, source: insight.source },
    })
  }

  for (const cat of UDEMY_CATEGORIES) {
    const trendData = generateTrendData(cat.slug, cat.growthRate, cat.searchVolume)
    for (const td of trendData) {
      await db.searchTrend.create({
        data: { platform, keyword: cat.slug, categorySlug: cat.slug, month: td.month, volume: td.volume, growthRate: cat.growthRate },
      })
    }
  }

  for (const idea of UDEMY_PRODUCT_IDEAS) {
    await db.productIdea.create({
      data: {
        platform, name: idea.name, category: idea.category,
        estimatedPrice: idea.estimatedPrice, estimatedMonthlySales: idea.estimatedMonthlySales,
        estimatedMonthlyEnroll: idea.estimatedMonthlyEnroll, estimatedMonthlyRevenue: idea.estimatedMonthlyRevenue,
        demandScore: idea.demandScore, supplyScore: idea.supplyScore, gapScore: idea.gapScore,
        difficulty: idea.difficulty, timeToCreate: idea.timeToCreate, reason: idea.reason,
      },
    })
  }
}

// ===================== CAPAFY REFRESH =====================
async function refreshCapafy() {
  const platform: Platform = 'capafy'

  await db.$transaction([
    db.productIdea.deleteMany({ where: { platform } }),
    db.searchTrend.deleteMany({ where: { platform } }),
    db.marketInsight.deleteMany({ where: { platform } }),
    db.product.deleteMany({ where: { platform } }),
    db.category.deleteMany({ where: { platform } }),
  ])

  const categorySlugToId: Record<string, string> = {}
  for (const cat of CAPAFY_CATEGORIES) {
    const created = await db.category.create({
      data: {
        platform, name: cat.name, slug: cat.slug, description: cat.description,
        icon: cat.icon, color: cat.color, avgPrice: cat.avgPrice, totalProducts: cat.totalProducts,
        totalRevenue: cat.totalRevenue, searchVolume: cat.searchVolume,
        demandScore: cat.demandScore, supplyScore: cat.supplyScore,
        competitionIndex: cat.competitionIndex, growthRate: cat.growthRate,
        trendDirection: cat.trendDirection, avgRating: cat.avgRating, avgReviews: cat.avgReviews,
        source: cat.source,
      },
    })
    categorySlugToId[cat.slug] = created.id
  }

  for (const prod of CAPAFY_PRODUCTS) {
    const catSlug = getCapafyCategorySlug(prod.name)
    const categoryId = categorySlugToId[catSlug] || categorySlugToId['prompt-engineering']!
    await db.product.create({
      data: {
        platform, name: prod.name, categoryId, price: prod.price, salesCount: prod.salesCount,
        revenue: Math.round(prod.price * prod.salesCount), rating: prod.rating, reviewCount: prod.reviewCount,
        demandScore: prod.demandScore, supplyScore: prod.supplyScore,
        opportunityScore: calcOpportunityScore(prod.demandScore, prod.supplyScore),
        tags: prod.tags, type: 'other', avgMonthlySales: prod.avgMonthlySales || 0,
        priceRange: 'mid', isTrending: prod.isTrending, creator: prod.creator, url: prod.url,
      },
    })
  }

  for (const insight of CAPAFY_INSIGHTS) {
    await db.marketInsight.create({
      data: { platform, title: insight.title, description: insight.description, insightType: insight.insightType, impactScore: insight.impactScore, source: insight.source },
    })
  }

  for (const cat of CAPAFY_CATEGORIES) {
    const trendData = generateTrendData(cat.slug, cat.growthRate, cat.searchVolume)
    for (const td of trendData) {
      await db.searchTrend.create({
        data: { platform, keyword: cat.slug, categorySlug: cat.slug, month: td.month, volume: td.volume, growthRate: cat.growthRate },
      })
    }
  }

  for (const idea of CAPAFY_PRODUCT_IDEAS) {
    await db.productIdea.create({
      data: {
        platform, name: idea.name, category: idea.category,
        estimatedPrice: idea.estimatedPrice, estimatedMonthlySales: idea.estimatedMonthlySales,
        estimatedMonthlyRevenue: idea.estimatedMonthlyRevenue,
        demandScore: idea.demandScore, supplyScore: idea.supplyScore, gapScore: idea.gapScore,
        difficulty: idea.difficulty, timeToCreate: idea.timeToCreate, reason: idea.reason,
      },
    })
  }
}

export function getLastRefreshTimestamp(): Promise<{ platform: string; createdAt: Date } | null> {
  return db.refreshLog.findFirst({
    where: { platform: 'all', status: 'success' },
    orderBy: { createdAt: 'desc' },
    select: { platform: true, createdAt: true },
  })
}
