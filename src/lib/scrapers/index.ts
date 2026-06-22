import { db } from '@/lib/db'
import { fetchMultipleTrends, getSearchTermsForCategory, TrendResult } from './trends'
import { fetchAllCapafyCategories, CAPAFY_REAL_CATEGORIES, CapafyScrapeResult } from './capafy'
import { fetchAllGumroadCategories, GumroadScrapeResult } from './gumroad'
import {
  calculateDemandScore,
  calculateSupplyScore,
  calculateCompetitionIndex,
  calculateOpportunityScore,
  determineTrendDirection,
  CategoryStats,
} from './scoring'

export type Platform = 'gumroad' | 'capafy'

/**
 * Kategori config — gerçek platform kategorilerine dayalı
 */
const PLATFORM_CATEGORIES: Record<Platform, { name: string; slug: string; description: string; icon: string; color: string }[]> = {
  gumroad: [
    { name: 'Yazılım Geliştirme', slug: 'software-development', description: 'SaaS starter kitleri, boilerplate\'lar, API şablonları', icon: 'Code', color: '#10b981' },
    { name: 'İş ve Para', slug: 'business-money', description: 'İş planları, finansal modelleme, startup kiti', icon: 'Briefcase', color: '#3b82f6' },
    { name: '3D Varlıklar', slug: '3d-assets', description: '3D modeller, Blender şablonları, game assets', icon: 'Box', color: '#f59e0b' },
    { name: 'Tasarım Grafik', slug: 'design-graphics', description: 'UI/UX kitleri, grafik tasarım şablonları', icon: 'Palette', color: '#ec4899' },
    { name: 'AI Prompt Paketleri', slug: 'ai-prompts', description: 'ChatGPT, Midjourney, Claude prompt paketleri', icon: 'Sparkles', color: '#8b5cf6' },
    { name: 'Notion Şablonları', slug: 'notion-templates', description: 'Notion dashboard, template ve sistemler', icon: 'FileText', color: '#6366f1' },
    { name: 'Video Prodüksiyon', slug: 'video-production', description: 'Video editing şablonları, motion graphics', icon: 'Video', color: '#ef4444' },
    { name: 'Müzik ve Ses', slug: 'music-audio', description: 'Müzik prodüksiyon, preset ve sample paketleri', icon: 'Music', color: '#14b8a6' },
    { name: 'Oyun Geliştirme', slug: 'game-development', description: 'Unity/Unreal assetleri, 2D/3D oyun varlıkları', icon: 'Gamepad2', color: '#f97316' },
    { name: 'Yazarlık ve Yayıncılık', slug: 'writing-publishing', description: 'E-kitap şablonları, writing guide ve araçları', icon: 'BookOpen', color: '#78716c' },
    { name: 'Pazarlama SEO', slug: 'marketing-seo', description: 'Pazarlama şablonları, SEO araçları ve kitleri', icon: 'TrendingUp', color: '#06b6d4' },
    { name: 'Kişisel Gelişim', slug: 'self-development', description: 'Kişisel gelişim kaynakları, productivity guide', icon: 'UserPlus', color: '#84cc16' },
  ],
  capafy: Object.entries(CAPAFY_REAL_CATEGORIES).map(([slug, info]) => ({
    slug,
    name: info.name,
    description: `Capafy AI agent marketplace — categoryIds: ${info.categoryIds.join(', ')}`,
    icon: 'Bot',
    color: '#8b5cf6',
  })),
}

const PLATFORM_SOURCE: Record<Platform, string> = {
  gumroad: 'Gumroad Discover API + pagination + tags_data + Google Trends',
  capafy: 'Capafy API v1 union scraping (pagination yok, 5×semantic queries) + Google Trends',
}

function getProductType(_platform: Platform): string {
  return 'other'
}

function getPriceRange(price: number, isFree: boolean = false): string {
  if (isFree || price === 0) return 'free'
  if (price > 50) return 'premium'
  if (price > 20) return 'mid'
  return 'budget'
}

/**
 * Tag'leri DB'ye kaydet (many-to-many). Mevcut tag'leri döndürür.
 */
async function upsertTags(
  platform: string,
  tags: string[]
): Promise<Map<string, string>> {
  const tagMap = new Map<string, string>()
  for (const tagName of tags) {
    if (!tagName || tagName.length > 80) continue
    try {
      const tag = await db.tag.upsert({
        where: { platform_name: { platform, name: tagName } },
        create: { name: tagName, platform, productCount: 0 },
        update: {},
      })
      tagMap.set(tagName, tag.id)
    } catch {
      // sessizce atla
    }
  }
  return tagMap
}

async function linkProductTags(productId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return
  try {
    // SQLite skipDuplicates desteklemiyor, tek tek insert + try/catch ile duplicate'leri yut
    for (const tagId of tagIds) {
      try {
        await db.productTag.create({
          data: { productId, tagId },
        })
      } catch {
        // unique violation → zaten var, devam
      }
    }
  } catch {
    // sessizce atla
  }
}

/**
 * Tek platformu yeniler (atomik transaction).
 *
 * VERİ BÜTÜNLÜĞÜ:
 * - Eski veriler silinir ve yenisi TEK transaction'da yazılır.
 * - Hata olursa transaction rollback → eski veri korunur.
 * - Scraping başarısız olursa uydurulmuş fallback KULLANILMAZ.
 * - Kategori ne ürün ne trend verisi yoksa ATLANIR.
 */
async function refreshPlatformData(platform: Platform): Promise<void> {
  const categories = PLATFORM_CATEGORIES[platform]

  // 1. Veri toplama
  const allSearchTerms = categories.flatMap((cat) => getSearchTermsForCategory(cat.slug, platform))
  const trendResults = await fetchMultipleTrends(allSearchTerms)

  let scrapedResult: CapafyScrapeResult | GumroadScrapeResult
  if (platform === 'capafy') {
    scrapedResult = await fetchAllCapafyCategories(categories.map((c) => c.slug))
  } else {
    scrapedResult = await fetchAllGumroadCategories(categories.map((c) => c.slug))
  }
  const scrapedData = scrapedResult.categories

  // 2. Kategori istatistikleri
  const validCategories: typeof categories = []
  const allCategoryStats: CategoryStats[] = []
  const categoryGrowthRates: number[] = []

  for (const cat of categories) {
    const scraped: any = scrapedData.get(cat.slug)
    const searchTerms = getSearchTermsForCategory(cat.slug, platform)
    const trend = trendResults.get(searchTerms[0])

    const hasProductData = scraped && scraped.totalProducts > 0
    const hasTrendData = trend && trend.avgVolume > 0

    if (!hasProductData && !hasTrendData) {
      console.warn(`[${platform}] "${cat.slug}" icin veri yok, kategori atlaniyor`)
      continue
    }

    validCategories.push(cat)

    // Platform'a göre gerçek total çekme
    let realTotalProducts: number | null = null
    let sampleSize = scraped?.totalProducts ?? 0
    if (scraped) {
      if ('realTotalProducts' in scraped && scraped.realTotalProducts) {
        realTotalProducts = scraped.realTotalProducts
      }
      if ('sampleSize' in scraped && scraped.sampleSize) {
        sampleSize = scraped.sampleSize
      }
    }

    const totalProducts = scraped?.totalProducts ?? 0
    const avgPrice = scraped?.avgPrice ?? 0
    const avgRating = scraped?.avgRating ?? 0
    const avgReviews = scraped?.avgReviews ?? 0
    const searchVolume = trend?.avgVolume ?? 0
    const growthRate = trend?.growthRate ?? 0
    const totalStudents = 0

    // H10 düzeltmesi: totalRevenue heuristic bazlı (salesEstimationMethod flag'i ile)
    let totalRevenue = 0
    let revenueEstimationMethod = 'platform_native'
    if (scraped && scraped.products.length > 0) {
      if (platform === 'gumroad') {
        // H10: avgMonthlySales heuristic → yıllık revenue tahmini
        totalRevenue = scraped.products.reduce(
          (sum: number, p: any) => sum + (p.price || 0) * (p.avgMonthlySales || 0) * 12,
          0
        )
        revenueEstimationMethod = 'price_x_estimated_sales'
      } else {
        // Capafy: gerçek salesVolume varsa kullan, yoksa 0
        totalRevenue = scraped.products.reduce(
          (sum: number, p: any) => sum + (p.price || 0) * (p.salesCount || 0),
          0
        )
        revenueEstimationMethod = totalRevenue > 0 ? 'price_x_sales' : 'free_only'
      }
    }

    allCategoryStats.push({
      avgPrice,
      totalProducts,
      realTotalProducts,
      totalRevenue,
      revenueEstimationMethod: totalRevenue > 0 ? revenueEstimationMethod : 'no_data',
      searchVolume,
      avgRating,
      avgReviews,
      totalStudents,
    })
    categoryGrowthRates.push(growthRate)
  }

  if (validCategories.length === 0) {
    throw new Error(`${platform}: hic gecerli gercek veri alinamadi; refresh iptal edildi`)
  }

  // 3. Atomik transaction
  await db.$transaction(async (tx) => {
    // Eski verileri sil
    await tx.productTag.deleteMany({ where: { product: { platform } } })
    await tx.productIdea.deleteMany({ where: { platform } })
    await tx.searchTrend.deleteMany({ where: { platform } })
    await tx.marketInsight.deleteMany({ where: { platform } })
    await tx.product.deleteMany({ where: { platform } })
    await tx.category.deleteMany({ where: { platform } })

    const categorySlugToId: Record<string, string> = {}

    for (let i = 0; i < validCategories.length; i++) {
      const cat = validCategories[i]
      if (!cat) continue
      const stats = allCategoryStats[i]
      if (!stats) continue
      const growthRate = categoryGrowthRates[i] ?? 0

      const demandScore = calculateDemandScore(stats, allCategoryStats)
      const supplyScore = calculateSupplyScore(stats, allCategoryStats)

      // v2 alanları
      const scraped: any = scrapedData.get(cat.slug)
      const realTotalProducts = stats.realTotalProducts ?? null
      const sampleSize = scraped && 'sampleSize' in scraped ? scraped.sampleSize : scraped?.totalProducts ?? 0

      // Capafy categoryId distribution (debug)
      let platformCategoryId: string | null = null
      if (scraped && 'categoryIdDistribution' in scraped) {
        const dist = (scraped as any).categoryIdDistribution as Record<string, number>
        const top = Object.entries(dist).sort((a, b) => b[1] - a[1])[0]
        if (top) platformCategoryId = top[0]
      }

      const created = await tx.category.create({
        data: {
          platform,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          avgPrice: stats.avgPrice,
          totalProducts: stats.totalProducts,
          totalRevenue: stats.totalRevenue,
          totalStudents: stats.totalStudents || null,
          searchVolume: stats.searchVolume,
          demandScore,
          supplyScore,
          competitionIndex: calculateCompetitionIndex(demandScore, supplyScore),
          growthRate,
          trendDirection: determineTrendDirection(growthRate),
          avgRating: stats.avgRating || null,
          avgReviews: stats.avgReviews || null,
          realTotalProducts,
          sampleSize,
          platformCategoryId,
          dataFreshness: new Date(),
          scrapingStrategy: platform === 'capafy' ? 'union' : 'pagination',
          revenueEstimationMethod: stats.revenueEstimationMethod || 'no_data',
          source: PLATFORM_SOURCE[platform],
        },
      })
      categorySlugToId[cat.slug] = created.id
    }

    // Ürünleri oluştur
    const productsToCreate: Array<Record<string, unknown>> = []
    const tagUpserts: Array<{ productId: string; tags: string[] }> = []

    for (const cat of validCategories) {
      const scraped = scrapedData.get(cat.slug)
      const categoryId = categorySlugToId[cat.slug]
      if (!scraped || !categoryId) continue

      for (const product of (scraped.products as any[])) {
        const demandScore = product.demandScore ?? 5
        const supplyScore = product.supplyScore ?? 5

        // Platform-specific alanlar
        let platformProductId: string | null = null
        let titleSlug: string | null = null
        let creator: string | null = null
        let salesEstimationMethod: string | null = null
        let salesCount = 0
        let avgMonthlySales = 0
        let price = 0
        let rating = 0
        let reviewCount = 0
        let isFree = false
        let hasFreeTrial = false
        let tags: string[] = []
        let url: string | null = null
        let dataSourceJson: string | null = null

        if (platform === 'capafy') {
          const p = product as any
          platformProductId = p.agentId
          titleSlug = p.titleSlug ?? null
          creator = p.creator ?? null
          price = p.price ?? 0
          salesCount = p.salesCount ?? 0
          avgMonthlySales = p.avgMonthlySales ?? 0
          rating = p.rating ?? 0
          reviewCount = p.reviewCount ?? 0 // developerFollowerCount proxy
          isFree = p.isFree ?? false
          hasFreeTrial = p.hasFreeTrial ?? false
          tags = p.tags ?? []
          url = p.url ?? null
          salesEstimationMethod = salesCount > 0 ? 'volume_heuristic' : isFree ? 'free' : hasFreeTrial ? 'free_trial' : 'no_data'
          dataSourceJson = JSON.stringify({
            endpoint: 'agent/agents/search',
            fetchedAt: p.fetchedAt,
            categoryIds: p.rawCategoryIds,
            creditScore: p.creditScore,
          })
        } else {
          const p = product as any
          platformProductId = p.permalink
          titleSlug = p.permalink ?? null
          creator = p.seller ?? null
          price = p.price ?? 0
          salesCount = 0 // Gumroad native sales hidden
          avgMonthlySales = p.avgMonthlySales ?? 0
          rating = p.rating ?? 0
          reviewCount = p.reviewCount ?? 0
          isFree = p.isFree ?? false
          hasFreeTrial = false
          tags = p.tags ?? []
          url = p.url ?? null
          salesEstimationMethod = reviewCount > 0 ? 'review_heuristic' : isFree ? 'free' : 'no_data'
          dataSourceJson = JSON.stringify({
            endpoint: 'discover',
            fetchedAt: p.fetchedAt,
            nativeType: p.nativeType,
            sellerVerified: p.sellerIsVerified,
          })
        }

        productsToCreate.push({
          platform,
          name: product.name,
          categoryId,
          price,
          salesCount,
          revenue: Math.round(price * avgMonthlySales * 12),
          rating,
          reviewCount,
          demandScore,
          supplyScore,
          opportunityScore: calculateOpportunityScore(demandScore, supplyScore),
          tags: tags.join(','),
          type: getProductType(platform),
          avgMonthlySales,
          priceRange: getPriceRange(price, isFree),
          isTrending: salesCount > 10 || reviewCount > 50,
          creator,
          url,
          salesEstimationMethod,
          popularityScore: null, // Google Trends'ten beslenecek
          platformProductId,
          titleSlug,
          isFree,
          hasFreeTrial,
          dataSource: dataSourceJson,
        })
      }
    }

    if (productsToCreate.length > 0) {
      // createMany ile batch insert
      await tx.product.createMany({ data: productsToCreate as never })

      // Tag'leri transaction içinde oluştur ve bağla (FK constraint için)
      const productsWithTags = await tx.product.findMany({
        where: { platform },
        select: { id: true, tags: true },
      })

      // Önce tüm unique tag isimlerini topla
      const allTagNames = new Set<string>()
      for (const p of productsWithTags) {
        const tagNames = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
        tagNames.forEach((n) => allTagNames.add(n))
      }

      // Tag'leri transaction içinde upsert et
      const tagIdMap = new Map<string, string>()
      const tagNameCounts = new Map<string, number>()
      for (const p of productsWithTags) {
        const tagNames = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
        for (const tagName of tagNames) {
          tagNameCounts.set(tagName, (tagNameCounts.get(tagName) || 0) + 1)
        }
      }
      for (const tagName of allTagNames) {
        if (!tagName || tagName.length > 80) continue
        const productCount = tagNameCounts.get(tagName) || 0
        const tag = await tx.tag.upsert({
          where: { platform_name: { platform, name: tagName } },
          create: { name: tagName, platform, productCount },
          update: { productCount },
        })
        tagIdMap.set(tagName, tag.id)
      }

      // Ürün-tag ilişkilerini kur (zaten tagIdMap'ten geçti, sadece create)
      for (const p of productsWithTags) {
        const tagNames = (p.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
        for (const tagName of tagNames) {
          const tagId = tagIdMap.get(tagName)
          if (!tagId) continue
          try {
            await tx.productTag.create({
              data: { productId: p.id, tagId },
            })
          } catch {
            // unique violation → zaten var
          }
        }
      }
    }

    // Trend verisi
    const trendsToCreate: Array<Record<string, unknown>> = []
    for (const [keyword, trend] of trendResults) {
      for (const point of trend.data) {
        trendsToCreate.push({
          platform,
          keyword: trend.keyword,
          categorySlug: keyword,
          month: point.month,
          volume: point.volume,
          growthRate: trend.growthRate,
        })
      }
    }
    if (trendsToCreate.length > 0) {
      await tx.searchTrend.createMany({ data: trendsToCreate as never })
    }

    // Insight'lar
    const insightsToCreate = buildInsights(platform, allCategoryStats, trendResults)
    if (insightsToCreate.length > 0) {
      await tx.marketInsight.createMany({ data: insightsToCreate as never })
    }
  })
}

function buildInsights(
  platform: Platform,
  allStats: CategoryStats[],
  trendResults: Map<string, TrendResult>
): Array<Record<string, unknown>> {
  const insights: Array<Record<string, unknown>> = []
  if (allStats.length === 0) return insights

  // En yüksek talep kategorisi
  const sortedByVolume = [...allStats].sort((a, b) => b.searchVolume - a.searchVolume)
  const top = sortedByVolume[0]
  if (top && top.searchVolume > 0) {
    const second = sortedByVolume[1]
    const ratio = second && second.searchVolume > 0 ? top.searchVolume / second.searchVolume : 1
    insights.push({
      platform,
      title: 'Ürün Talebi En Yüksek Kategori',
      description: `Toplam ${top.searchVolume.toLocaleString()} popularity skoru (Google Trends 0-100) ile en çok talep gören kategori. Bu kategorideki talep diğerlerinden %${Math.round((ratio - 1) * 100)} daha yüksek. NOT: Bu relative popülerlik skorudur, mutlak arama hacmi değildir.`,
      insightType: 'opportunity',
      impactScore: Math.min(10, Math.round(ratio * 5 * 10) / 10),
      source: 'Google Trends + Platform Verileri',
    })
  }

  // Growth rate analizi
  for (const [keyword, trend] of trendResults) {
    if (trend.growthRate > 30) {
      insights.push({
        platform,
        title: `"${keyword}" Arama Hacmi +%${trend.growthRate} Büyüyor`,
        description: `Son 12 ayda "${keyword}" aramaları %${trend.growthRate} artış gösterdi. En yüksek hacim ${trend.peakMonth} tarihinde ölçüldü. Bu trend devam ederse önümüzdeki 6 ayda talep daha da artacak.`,
        insightType: 'opportunity',
        impactScore: Math.min(trend.growthRate / 10, 10),
        source: 'Google Trends',
      })
    } else if (trend.growthRate < -10) {
      insights.push({
        platform,
        title: `"${keyword}" Talebi Düşüşte -%${Math.abs(trend.growthRate)}`,
        description: `Son 12 ayda "${keyword}" aramaları %${Math.abs(trend.growthRate)} azaldı. Bu kategoride yeni ürün çıkarmak için doğru zaman olmayabilir.`,
        insightType: 'warning',
        impactScore: Math.min(Math.abs(trend.growthRate) / 10, 8),
        source: 'Google Trends',
      })
    }
  }

  // Doymuş pazar / düşük rekabet
  for (const stats of allStats) {
    const supplyScore = calculateSupplyScore(stats, allStats)
    const realTotal = stats.realTotalProducts ?? stats.totalProducts
    if (supplyScore > 7.5) {
      insights.push({
        platform,
        title: 'Yüksek Rekabet Uyarısı',
        description: `${realTotal.toLocaleString()} adet ürün ile bu kategori doymuş durumda. Yeni girenler için farklılaştırma şart.`,
        insightType: 'warning',
        impactScore: 7.5,
        source: 'Platform Verileri',
      })
    } else if (supplyScore < 3.0) {
      insights.push({
        platform,
        title: 'Düşük Rekabet - Büyük Fırsat',
        description: `Rekabetin çok düşük olduğu bu kategoride ilk hamle avantajı var. Az sayıda ürün var ama talep yüksek.`,
        insightType: 'opportunity',
        impactScore: 9.0,
        source: 'Platform Verileri',
      })
    }
  }

  return insights
}

export async function refreshPlatform(platform: Platform): Promise<{ platform: Platform; status: 'success' | 'error'; duration: number; message: string }> {
  const start = Date.now()
  try {
    await refreshPlatformData(platform)

    await db.refreshLog.create({
      data: {
        platform,
        status: 'success',
        duration: Date.now() - start,
        message: `${platform} verileri basariyla guncellendi (v2 union scraping + pagination)`,
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

export async function refreshAllPlatforms(): Promise<{ platform: Platform; status: 'success' | 'error'; duration: number; message: string }[]> {
  const globalCache = globalThis as unknown as { refreshCache?: Map<string, { data: unknown; timestamp: number }> }
  if (globalCache.refreshCache) {
    globalCache.refreshCache.clear()
  }

  const results: { platform: Platform; status: 'success' | 'error'; duration: number; message: string }[] = []
  for (const platform of ['gumroad', 'capafy'] as Platform[]) {
    results.push(await refreshPlatform(platform))
  }

  const allSuccess = results.every((r) => r.status === 'success')
  await db.refreshLog.create({
    data: {
      platform: 'all',
      status: allSuccess ? 'success' : 'error',
      duration: results.reduce((s, r) => s + r.duration, 0),
      message: allSuccess
        ? '2 platform da basariyla guncellendi (v2)'
        : `Bazi platformlarda hata: ${results.filter((r) => r.status === 'error').map((r) => r.platform).join(', ')}`,
    },
  })

  return results
}

export type { GumroadScrapeResult, CapafyScrapeResult }
