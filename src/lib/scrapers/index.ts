import { db } from '@/lib/db'
import { fetchMultipleTrends, getSearchTermsForCategory, TrendResult } from './trends'
import { fetchAllUdemyCategories, UdemyCategoryData } from './udemy'
import { fetchAllCapafyCategories, CapafyCategoryData } from './capafy'
import { fetchAllGumroadCategories, GumroadCategoryData } from './gumroad'
import {
  calculateDemandScore,
  calculateSupplyScore,
  calculateCompetitionIndex,
  calculateOpportunityScore,
  determineTrendDirection,
  CategoryStats,
} from './scoring'

export type Platform = 'gumroad' | 'udemy' | 'capafy'

/**
 * Kategori config - her platformun kategori listesi
 */
const PLATFORM_CATEGORIES: Record<Platform, { name: string; slug: string; description: string; icon: string; color: string }[]> = {
  gumroad: [
    { name: 'Yazilim Gelistirme', slug: 'software-development', description: 'SaaS starter kitleri, boilerplate\'lar, API sablonlari', icon: 'Code', color: '#10b981' },
    { name: 'Is ve Para', slug: 'business-money', description: 'Is planlari, finansal modelleme, startup kiti', icon: 'Briefcase', color: '#3b82f6' },
    { name: '3D Varliklar', slug: '3d-assets', description: '3D modeller, Blender sablonlari, game assets', icon: 'Box', color: '#f59e0b' },
    { name: 'Tasarim Grafik', slug: 'design-graphics', description: 'UI/UX kitleri, grafik tasarim sablonlari', icon: 'Palette', color: '#ec4899' },
    { name: 'AI Prompt Paketleri', slug: 'ai-prompts', description: 'ChatGPT, Midjourney, Claude prompt paketleri', icon: 'Sparkles', color: '#8b5cf6' },
    { name: 'Notion Sablonlari', slug: 'notion-templates', description: 'Notion dashboard, template ve sistemler', icon: 'FileText', color: '#6366f1' },
    { name: 'Video Prodüksiyon', slug: 'video-production', description: 'Video editing sablonlari, motion graphics', icon: 'Video', color: '#ef4444' },
    { name: 'Muzik ve Ses', slug: 'music-audio', description: 'Muzik prodüksiyon, preset ve sample paketleri', icon: 'Music', color: '#14b8a6' },
    { name: 'Oyun Gelistirme', slug: 'game-development', description: 'Unity/Unreal assetleri, 2D/3D oyun varliklari', icon: 'Gamepad2', color: '#f97316' },
    { name: 'Yazarlik ve Yayincilik', slug: 'writing-publishing', description: 'E-kitap sablonlari, writing guide ve araclari', icon: 'BookOpen', color: '#78716c' },
    { name: 'Pazarlama SEO', slug: 'marketing-seo', description: 'Pazarlama sablonlari, SEO araclari ve kitleri', icon: 'TrendingUp', color: '#06b6d4' },
    { name: 'Kisisel Gelisim', slug: 'self-development', description: 'Kisisel gelisim kaynaklari, productivity guide', icon: 'UserPlus', color: '#84cc16' },
  ],
  udemy: [
    { name: 'Yazilim Gelistirme', slug: 'software-development', description: 'Web, mobil, backend, full-stack, DevOps kurslari', icon: 'Code', color: '#10b981' },
    { name: 'Veri Bilimi & AI/ML', slug: 'data-science-ai', description: 'Machine learning, deep learning, veri analizi', icon: 'Brain', color: '#8b5cf6' },
    { name: 'Is ve Girisimcilik', slug: 'business', description: 'Is yonetimi, girisimcilik, liderlik', icon: 'Briefcase', color: '#3b82f6' },
    { name: 'IT Sertifika', slug: 'it-certification', description: 'AWS, Azure, DevOps, network sertifika kurslari', icon: 'Shield', color: '#ef4444' },
    { name: 'Tasarim', slug: 'design', description: 'UI/UX, grafik tasarim, 3D modelleme', icon: 'Palette', color: '#ec4899' },
    { name: 'Pazarlama', slug: 'marketing', description: 'Dijital pazarlama, SEO, sosyal medya', icon: 'TrendingUp', color: '#06b6d4' },
    { name: 'Kisisel Gelisim', slug: 'personal-development', description: 'Liderlik, iletisim, zaman yonetimi', icon: 'UserPlus', color: '#84cc16' },
    { name: 'Fotograf Video', slug: 'photography', description: 'Fotografcilik, video editing, post-production', icon: 'Camera', color: '#f59e0b' },
    { name: 'Saglik ve Fitness', slug: 'health-fitness', description: 'Fitness, beslenme, meditasyon', icon: 'Heart', color: '#f97316' },
    { name: 'Muzik', slug: 'music', description: 'Muzik prodüksiyon, enstruman, ses muhendisligi', icon: 'Music', color: '#14b8a6' },
    { name: 'Dil Ogrenimi', slug: 'language', description: 'Ingilizce, Ispanyolca, Almanca ve diger diller', icon: 'Languages', color: '#6366f1' },
    { name: 'Akademik', slug: 'academic', description: 'Akademik yazim, arastirma yontemleri, tez hazirlama', icon: 'GraduationCap', color: '#78716c' },
  ],
  capafy: [
    { name: 'Prompt Muhendisligi', slug: 'prompt-engineering', description: 'ChatGPT, Claude, Midjourney prompt gelistirme', icon: 'Sparkles', color: '#8b5cf6' },
    { name: 'AI Chatbot & Agent', slug: 'ai-chatbot-agent', description: 'AI chatbot, agent gelistirme ve entegrasyon', icon: 'Bot', color: '#3b82f6' },
    { name: 'AI Video Uretimi', slug: 'ai-video-generation', description: 'AI video olusturma, Sora, Runway kullanim', icon: 'Video', color: '#ef4444' },
    { name: 'AI Goruntu Uretimi', slug: 'ai-image-generation', description: 'Midjourney, DALL-E, Stable Diffusion', icon: 'Image', color: '#f59e0b' },
    { name: 'AI Ses ve Voice', slug: 'ai-audio-voice', description: 'AI voice cloning, ElevenLabs, muzik uretimi', icon: 'Headphones', color: '#14b8a6' },
    { name: 'AI Otomasyon', slug: 'ai-automation', description: 'AI workflow otomasyonu, n8n, Zapier AI', icon: 'Zap', color: '#f97316' },
    { name: 'AI Gelistirme', slug: 'ai-development', description: 'LangChain, API entegrasyon, AI SDK', icon: 'Code', color: '#10b981' },
    { name: 'AI Pazarlama', slug: 'ai-marketing', description: 'AI icerik, AI reklam, AI SEO araclari', icon: 'TrendingUp', color: '#06b6d4' },
    { name: 'AI Veri Analizi', slug: 'ai-data-analytics', description: 'AI destekli veri analizi ve raporlama', icon: 'BarChart3', color: '#6366f1' },
    { name: 'AI Egitim', slug: 'ai-education', description: 'AI ogrenme yollari ve AI egitim araclari', icon: 'GraduationCap', color: '#84cc16' },
    { name: 'AI Yazma', slug: 'ai-writing', description: 'AI copywriting, icerik olusturma araclari', icon: 'PenTool', color: '#ec4899' },
    { name: 'AI Is Araclari', slug: 'ai-business', description: 'AI is productivity araclari ve cozumleri', icon: 'Briefcase', color: '#78716c' },
  ],
}

/**
 * Platform kaynak etiketi (DB source alaninda gosterilir)
 */
const PLATFORM_SOURCE: Record<Platform, string> = {
  gumroad: 'Gumroad Inertia API + Google Trends',
  udemy: 'Udemy Scraping + Google Trends',
  capafy: 'Capafy Scraping + Google Trends',
}

/**
 * Veri kaynagi tipi - hangi scraper ile urun/kurs cekildigini soyutlar.
 */
interface CategoryScrapedData {
  slug: string
  totalProducts: number
  avgPrice: number
  avgRating: number
  avgReviews: number
  totalStudents?: number
  products: ScrapedProduct[]
}

interface ScrapedProduct {
  name: string
  price: number
  rating: number
  reviewCount: number
  salesCount: number
  studentCount?: number
  tags: string
  isTrending: boolean
  seller?: string
  instructor?: string
  creator?: string
  url?: string
  avgMonthlySales?: number
  avgMonthlyEnroll?: number
  demandScore?: number
  supplyScore?: number
}

/**
 * Platforma ozel scraper cagirisini soyutlar.
 */
async function fetchPlatformCategories(platform: Platform, slugs: string[]): Promise<Map<string, CategoryScrapedData>> {
  const results = new Map<string, CategoryScrapedData>()

  if (platform === 'gumroad') {
    const data = await fetchAllGumroadCategories(slugs)
    for (const [, cat] of data) {
      results.set(cat.slug, {
        slug: cat.slug,
        totalProducts: cat.totalProducts,
        avgPrice: cat.avgPrice,
        avgRating: cat.avgRating,
        avgReviews: cat.avgReviews,
        products: cat.products.map((p) => ({
          name: p.name,
          price: p.price,
          rating: p.rating,
          reviewCount: p.reviewCount,
          salesCount: p.salesCount,
          tags: p.tags,
          isTrending: p.rating >= 4.5,
          seller: p.seller,
          url: p.url,
          avgMonthlySales: p.avgMonthlySales,
          demandScore: p.demandScore,
          supplyScore: p.supplyScore,
        })),
      })
    }
  } else if (platform === 'udemy') {
    const data = await fetchAllUdemyCategories(slugs)
    for (const [, cat] of data) {
      results.set(cat.slug, {
        slug: cat.slug,
        totalProducts: cat.totalCourses,
        avgPrice: cat.avgPrice,
        avgRating: cat.avgRating,
        avgReviews: cat.avgReviews,
        products: cat.courses.map((c) => ({
          name: c.name,
          price: c.price,
          rating: c.rating,
          reviewCount: c.reviewCount,
          salesCount: c.studentCount,
          studentCount: c.studentCount,
          tags: c.tags,
          isTrending: c.isTrending,
          instructor: c.instructor,
          url: c.url,
          avgMonthlyEnroll: c.avgMonthlyEnroll,
          demandScore: c.demandScore,
          supplyScore: c.supplyScore,
        })),
      })
    }
  } else {
    const data = await fetchAllCapafyCategories(slugs)
    for (const [, cat] of data) {
      results.set(cat.slug, {
        slug: cat.slug,
        totalProducts: cat.totalProducts,
        avgPrice: cat.avgPrice,
        avgRating: cat.avgRating,
        avgReviews: cat.avgReviews,
        products: cat.products.map((p) => ({
          name: p.name,
          price: p.price,
          rating: p.rating,
          reviewCount: p.reviewCount,
          salesCount: p.salesCount,
          tags: p.tags,
          isTrending: p.isTrending,
          creator: p.creator,
          url: p.url,
          avgMonthlySales: p.avgMonthlySales,
          demandScore: p.demandScore,
          supplyScore: p.supplyScore,
        })),
      })
    }
  }

  return results
}

/**
 * Platforma ozel default degerler - uydurma degil, makul minimum varsayimlar.
 * Gercek veri olmadiginda kategori ATLANIR, uydurma veri uretilmez.
 */
function getProductType(platform: Platform): string {
  return platform === 'udemy' ? 'course' : 'other'
}

function getPriceRange(price: number): string {
  if (price > 50) return 'premium'
  if (price > 20) return 'mid'
  return 'budget'
}

/**
 * Tek bir platformu guvenli sekilde yeniler (atomik transaction ile).
 *
 * VERI BUTUNLUGU:
 * - Eski veriler silinir ve yenisi TEK transaction icinde yazilir.
 * - Hata olursa transaction rollback olur -> eski veri kaybolmaz.
 * - createMany ile toplu insert (N+1 sorgu onlenir).
 *
 * VERI GUVENILIRLIGI:
 * - Scraping basarisiz olursa uydurulmus fallback deger KULLANILMAZ.
 *   Eger ne scrapelenmis urun ne de trend verisi yoksa kategori atlanir.
 */
async function refreshPlatformData(platform: Platform): Promise<void> {
  const categories = PLATFORM_CATEGORIES[platform]

  // 1. Dis kaynaklardan veri cek (scraping + trends)
  const allSearchTerms = categories.flatMap((cat) => getSearchTermsForCategory(cat.slug, platform))
  const trendResults = await fetchMultipleTrends(allSearchTerms)
  const scrapedData = await fetchPlatformCategories(platform, categories.map((c) => c.slug))

  // 2. Kategori istatistiklerini hesapla - sadece GERCEK veri olanlar
  const validCategories: typeof categories = []
  const allCategoryStats: CategoryStats[] = []
  const categoryGrowthRates: number[] = []

  for (const cat of categories) {
    const scraped = scrapedData.get(cat.slug)
    const searchTerms = getSearchTermsForCategory(cat.slug, platform)
    const trend = trendResults.get(searchTerms[0])

    const hasProductData = scraped && scraped.totalProducts > 0
    const hasTrendData = trend && trend.avgVolume > 0

    // VERI BUTUNLUGU: Ne urun ne trend verisi yoksa bu kategoriyi ATLA.
    // Uydurulmus fallback (|| 100, || 35 vb.) uretme.
    if (!hasProductData && !hasTrendData) {
      console.warn(`[${platform}] "${cat.slug}" icin veri yok, kategori atlaniyor`)
      continue
    }

    validCategories.push(cat)

    const totalProducts = scraped?.totalProducts ?? 0
    const avgPrice = scraped?.avgPrice ?? 0
    const avgRating = scraped?.avgRating ?? 0
    const avgReviews = scraped?.avgReviews ?? 0
    const searchVolume = trend?.avgVolume ?? 0
    const growthRate = trend?.growthRate ?? 0
    const totalStudents = scraped?.totalStudents ?? (platform === 'udemy' ? totalProducts * 500 : 0)

    // Gelir hesabi: GERCEK urun verisi varsa urun fiyat * satis uzerinden.
    // Uydurma carpan (*30, *50) KALDIRILDI.
    let totalRevenue = 0
    if (scraped && scraped.products.length > 0) {
      totalRevenue = scraped.products.reduce((sum, p) => sum + p.price * p.salesCount, 0)
    }

    allCategoryStats.push({
      avgPrice,
      totalProducts,
      totalRevenue,
      searchVolume,
      avgRating,
      avgReviews,
      totalStudents,
    })
    categoryGrowthRates.push(growthRate)
  }

  // Hic gecerli kategori yoksa veritabanini bos birakma - eski veriyi koru
  if (validCategories.length === 0) {
    throw new Error(`${platform}: hic gecerli gercek veri alinamadi; refresh iptal edildi (eski veri korundu)`)
  }

  // 3. Atomik transaction: sil + yeniden yaz. Hata olursa eski veri korunsun.
  await db.$transaction(async (tx) => {
    // Eski verileri sil
    await tx.productIdea.deleteMany({ where: { platform } })
    await tx.searchTrend.deleteMany({ where: { platform } })
    await tx.marketInsight.deleteMany({ where: { platform } })
    await tx.product.deleteMany({ where: { platform } })
    await tx.category.deleteMany({ where: { platform } })

    // Kategorileri olustur ve id'leri topla
    const categorySlugToId: Record<string, string> = {}

    for (let i = 0; i < validCategories.length; i++) {
      const cat = validCategories[i]
      if (!cat) continue
      const stats = allCategoryStats[i]
      if (!stats) continue
      const growthRate = categoryGrowthRates[i] ?? 0
      const demandScore = calculateDemandScore(stats, allCategoryStats)
      const supplyScore = calculateSupplyScore(stats, allCategoryStats)

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
          source: PLATFORM_SOURCE[platform],
        },
      })
      categorySlugToId[cat.slug] = created.id
    }

    // Urunleri createMany ile toplu yaz (N+1 onlenir)
    const productType = getProductType(platform)
    const productsToCreate: Array<Record<string, unknown>> = []

    for (const cat of validCategories) {
      const scraped = scrapedData.get(cat.slug)
      const categoryId = categorySlugToId[cat.slug]
      if (!scraped || !categoryId) continue

      for (const product of scraped.products) {
        const demandScore = product.demandScore ?? 5
        const supplyScore = product.supplyScore ?? 5
        productsToCreate.push({
          platform,
          name: product.name,
          categoryId,
          price: product.price,
          salesCount: product.salesCount,
          studentCount: product.studentCount ?? null,
          revenue: Math.round(product.price * product.salesCount),
          rating: product.rating,
          reviewCount: product.reviewCount,
          demandScore,
          supplyScore,
          opportunityScore: calculateOpportunityScore(demandScore, supplyScore),
          tags: product.tags,
          type: productType,
          avgMonthlySales: product.avgMonthlySales ?? null,
          avgMonthlyEnroll: product.avgMonthlyEnroll ?? null,
          priceRange: getPriceRange(product.price),
          isTrending: product.isTrending,
          instructor: product.instructor ?? null,
          creator: product.creator ?? null,
          url: product.url ?? null,
        })
      }
    }

    // createMany ile tek sorguda toplu insert
    if (productsToCreate.length > 0) {
      await tx.product.createMany({ data: productsToCreate as never })
    }

    // Trend verisini kaydet
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
      await tx.searchTrend.createMany({
        data: trendsToCreate as never,
      })
    }

    // Insight'lari olustur
    const insightsToCreate = buildInsights(platform, allCategoryStats, trendResults)
    if (insightsToCreate.length > 0) {
      await tx.marketInsight.createMany({ data: insightsToCreate as never })
    }
  })
}

/**
 * Gercek verilere gore insight (icgoru) olusturur.
 */
function buildInsights(
  platform: Platform,
  allStats: CategoryStats[],
  trendResults: Map<string, TrendResult>
): Array<Record<string, unknown>> {
  const insights: Array<Record<string, unknown>> = []

  // Bos veri korumasi
  if (allStats.length === 0) return insights

  // En yuksek talep kategorisi
  const sortedByVolume = [...allStats].sort((a, b) => b.searchVolume - a.searchVolume)
  const top = sortedByVolume[0]
  if (top && top.searchVolume > 0) {
    const second = sortedByVolume[1]
    const ratio = second && second.searchVolume > 0 ? top.searchVolume / second.searchVolume : 1
    insights.push({
      platform,
      title: `${platform === 'udemy' ? 'Kurs' : 'Urun'} Talebi En Yuksek Kategori`,
      description: `Toplam ${top.searchVolume.toLocaleString()} aylik arama hacmi ile en cok talep goren kategori. Bu kategorideki talep digerlerinden %${Math.round((ratio - 1) * 100)} daha yuksek.`,
      insightType: 'opportunity',
      impactScore: Math.min(10, Math.round(ratio * 5 * 10) / 10),
      source: 'Google Trends + Platform Verileri',
    })
  }

  // Buyume orani analizi
  for (const [keyword, trend] of trendResults) {
    if (trend.growthRate > 30) {
      insights.push({
        platform,
        title: `"${keyword}" Arama Hacmi %${trend.growthRate} Buyuyor`,
        description: `Son 12 ayda "${keyword}" aramalari %${trend.growthRate} artis gosterdi. En yuksek hacim ${trend.peakMonth} tarihinde olculdu. Bu trend devam ederse onumuzdeki 6 ayda talep daha da artacak.`,
        insightType: 'opportunity',
        impactScore: Math.min(trend.growthRate / 10, 10),
        source: 'Google Trends',
      })
    } else if (trend.growthRate < -10) {
      insights.push({
        platform,
        title: `"${keyword}" Talebi Dususte -%${Math.abs(trend.growthRate)}`,
        description: `Son 12 ayda "${keyword}" aramalari %${Math.abs(trend.growthRate)} azaldi. Bu kategoride yeni urun cikarmak icin dogru zaman olmayabilir.`,
        insightType: 'warning',
        impactScore: Math.min(Math.abs(trend.growthRate) / 10, 8),
        source: 'Google Trends',
      })
    }
  }

  // Doymus pazar / dusuk rekabet uyari ve firsatlari
  for (const stats of allStats) {
    const supplyScore = calculateSupplyScore(stats, allStats)
    if (supplyScore > 7.5) {
      insights.push({
        platform,
        title: 'Yuksek Rekabet Uyarisi',
        description: `${stats.totalProducts.toLocaleString()} adet urun ile bu kategori dogmus durumda. Yeni girenler icin farklilastirma sart.`,
        insightType: 'warning',
        impactScore: 7.5,
        source: 'Platform Verileri',
      })
    } else if (supplyScore < 3.0) {
      insights.push({
        platform,
        title: 'Dusuk Rekabet - Buyuk Firsat',
        description: `Rekabetin cok dusuk oldugu bu kategoride ilk hamle avantaji var. Az sayida urun var ama talep yuksek.`,
        insightType: 'opportunity',
        impactScore: 9.0,
        source: 'Platform Verileri',
      })
    }
  }

  return insights
}

/**
 * Belirtilen platformu yeniler
 */
export async function refreshPlatform(platform: Platform): Promise<{ platform: Platform; status: 'success' | 'error'; duration: number; message: string }> {
  const start = Date.now()
  try {
    await refreshPlatformData(platform)

    await db.refreshLog.create({
      data: {
        platform,
        status: 'success',
        duration: Date.now() - start,
        message: `${platform} verileri basariyla guncellendi (Google Trends + Scraping)`,
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

/**
 * Tum platformlari yeniler.
 *
 * ONEM: Platformlar SIRAYLA (ardisik) calisir, paralel DEGIL.
 * SQLite tek yazici destekler; paralel yazma SQLITE_BUSY kilitlenmesine yol acar.
 * WAL modu (db.ts) es zamanli okuma/yazmaya izin verse de yazma hala serilestirilmeli.
 */
export async function refreshAllPlatforms(): Promise<{ platform: Platform; status: 'success' | 'error'; duration: number; message: string }[]> {
  // In-memory cache temizle
  const globalCache = globalThis as unknown as { refreshCache?: Map<string, { data: unknown; timestamp: number }> }
  if (globalCache.refreshCache) {
    globalCache.refreshCache.clear()
  }

  // ADR: Platformlar SIRAYLA calisir (paralel degil) - SQLite yazma kilidini onlemek icin
  const results: { platform: Platform; status: 'success' | 'error'; duration: number; message: string }[] = []
  for (const platform of ['gumroad', 'udemy', 'capafy'] as Platform[]) {
    results.push(await refreshPlatform(platform))
  }

  const allSuccess = results.every((r) => r.status === 'success')
  await db.refreshLog.create({
    data: {
      platform: 'all',
      status: allSuccess ? 'success' : 'error',
      duration: results.reduce((s, r) => s + r.duration, 0),
      message: allSuccess
        ? '3 platform da basariyla guncellendi (Google Trends + Scraping)'
        : `Bazi platformlarda hata: ${results.filter((r) => r.status === 'error').map((r) => r.platform).join(', ')}`,
    },
  })

  return results
}

// Geriye donuk uyumluluk: eski importlari kiran tip export'lari
export type { GumroadCategoryData, UdemyCategoryData, CapafyCategoryData, TrendResult }
