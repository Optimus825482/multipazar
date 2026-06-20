import { db } from '@/lib/db'
import { fetchKeywordTrends, fetchMultipleTrends, getSearchTermsForCategory, TrendResult } from './trends'
import { fetchAllUdemyCategories, UdemyCategoryData } from './udemy'
import { fetchAllCapafyCategories, CapafyCategoryData } from './capafy'
import { fetchAllGumroadCategories, GumroadCategoryData } from './gumroad'
import {
  calculateDemandScore,
  calculateSupplyScore,
  calculateCompetitionIndex,
  calculateOpportunityScore,
  calculateGrowthFromTrendData,
  estimateGrowthRate,
  determineTrendDirection,
  calculateUnmetDemand,
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
 * Google Trends verisi ile SearchTrend kayitlarini olusturur
 */
async function saveTrendData(platform: Platform, trendResults: Map<string, TrendResult>) {
  for (const [keyword, trend] of trendResults) {
    for (const point of trend.data) {
      await db.searchTrend.create({
        data: {
          platform,
          keyword: trend.keyword,
          categorySlug: keyword,
          month: point.month,
          volume: point.volume,
          growthRate: trend.growthRate,
        },
      }).catch(() => {
        // Unique constraint varsa atla (ayni keyword+month zaten var)
      })
    }
  }
}

/**
 * Gumroad verilerini Gumroad Inertia JSON API + Google Trends ile yeniler
 * X-Inertia header'i sayesinde direkt JSON doner (Puppeteer gerekmez)
 */
async function refreshGumroad() {
  const platform: Platform = 'gumroad'
  const categories = PLATFORM_CATEGORIES.gumroad

  // Tum eski verileri temizle
  await db.$transaction([
    db.productIdea.deleteMany({ where: { platform } }),
    db.searchTrend.deleteMany({ where: { platform } }),
    db.marketInsight.deleteMany({ where: { platform } }),
    db.product.deleteMany({ where: { platform } }),
    db.category.deleteMany({ where: { platform } }),
  ])

  // Google Trends verilerini cek
  const allSearchTerms = categories.flatMap((cat) => getSearchTermsForCategory(cat.slug, 'gumroad'))
  const trendResults = await fetchMultipleTrends(allSearchTerms)

  // Gumroad Inertia API ile gercek urun verilerini cek
  const gumroadSlugs = categories.map((c) => c.slug)
  const gumroadData = await fetchAllGumroadCategories(gumroadSlugs)

  // Kategorileri olustur
  const categorySlugToId: Record<string, string> = {}
  const allCategoryStats: CategoryStats[] = []

  for (const cat of categories) {
    const scraped = gumroadData.get(cat.slug)
    const trend = trendResults.get(getSearchTermsForCategory(cat.slug, 'gumroad')[0])

    const totalProducts = scraped?.totalProducts || 100
    const avgPrice = scraped?.avgPrice || 35
    const avgRating = scraped?.avgRating || 4.3
    const avgReviews = scraped?.avgReviews || 50
    const searchVolume = trend?.avgVolume || 15000
    const growthRate = trend?.growthRate || 15

    allCategoryStats.push({
      avgPrice,
      totalProducts,
      totalRevenue: totalProducts * avgPrice * 30,
      searchVolume,
      avgRating,
      avgReviews,
      totalStudents: 0,
    })
  }

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    const stats = allCategoryStats[i]
    const demandScore = calculateDemandScore(stats, allCategoryStats)
    const supplyScore = calculateSupplyScore(stats, allCategoryStats)

    const created = await db.category.create({
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
        searchVolume: stats.searchVolume,
        demandScore,
        supplyScore,
        competitionIndex: calculateCompetitionIndex(demandScore, supplyScore),
        growthRate,
        trendDirection: determineTrendDirection(growthRate),
        source: 'Gumroad Inertia API + Google Trends',
      },
    })
    categorySlugToId[cat.slug] = created.id
  }

  // Gumroad API'den gelen urunleri kaydet
  for (const [, catData] of gumroadData) {
    const categoryId = categorySlugToId[catData.slug]
    if (!categoryId) continue

    for (const product of catData.products) {
      await db.product.create({
        data: {
          platform,
          name: product.name,
          categoryId,
          price: product.price,
          salesCount: product.reviewCount,
          revenue: Math.round(product.price * product.reviewCount),
          rating: product.rating,
          reviewCount: product.reviewCount,
          demandScore: product.demandScore || 5,
          supplyScore: product.supplyScore || 5,
          opportunityScore: calculateOpportunityScore(product.demandScore || 5, product.supplyScore || 5),
          tags: product.tags,
          type: 'other',
          avgMonthlySales: product.avgMonthlySales || 0,
          priceRange: product.price > 50 ? 'premium' : product.price > 20 ? 'mid' : 'budget',
          isTrending: product.rating >= 4.5,
          instructor: product.seller,
          url: product.url,
        },
      }).catch((err) => console.error(`[Gumroad] Urun kaydetme hatasi: ${product.name}`, err.message))
    }
  }

  // Trend verisini kaydet
  await saveTrendData(platform, trendResults)

  // Insightlari olustur
  await generateInsights(platform, allCategoryStats, trendResults)
}

/**
 * Udemy verilerini Google Trends + Udemy scraping ile yeniler
 */
async function refreshUdemy() {
  const platform: Platform = 'udemy'
  const categories = PLATFORM_CATEGORIES.udemy

  // Eski verileri temizle
  await db.$transaction([
    db.productIdea.deleteMany({ where: { platform } }),
    db.searchTrend.deleteMany({ where: { platform } }),
    db.marketInsight.deleteMany({ where: { platform } }),
    db.product.deleteMany({ where: { platform } }),
    db.category.deleteMany({ where: { platform } }),
  ])

  // Google Trends verilerini cek
  const allSearchTerms = categories.flatMap((cat) => getSearchTermsForCategory(cat.slug, 'udemy'))
  const trendResults = await fetchMultipleTrends(allSearchTerms)

  // Udemy scraping ile gercek kurs verilerini cek
  const udemySlugs = categories.map((c) => c.slug)
  const udemyData = await fetchAllUdemyCategories(udemySlugs)

  // Kategorileri olustur
  const categorySlugToId: Record<string, string> = {}
  const allCategoryStats: CategoryStats[] = []

  for (const cat of categories) {
    const scraped = udemyData.get(cat.slug)
    const trend = trendResults.get(getSearchTermsForCategory(cat.slug, 'udemy')[0])

    const totalCourses = scraped?.totalCourses || 500
    const avgPrice = scraped?.avgPrice || 70
    const avgRating = scraped?.avgRating || 4.3
    const avgReviews = scraped?.avgReviews || 500
    const searchVolume = trend?.avgVolume || 500000
    const growthRate = trend?.growthRate || 15

    allCategoryStats.push({
      avgPrice,
      totalProducts: totalCourses,
      totalRevenue: totalCourses * avgPrice,
      searchVolume,
      avgRating,
      avgReviews,
      totalStudents: totalCourses * 500,
    })
  }

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    const stats = allCategoryStats[i]
    const demandScore = calculateDemandScore(stats, allCategoryStats)
    const supplyScore = calculateSupplyScore(stats, allCategoryStats)

    const created = await db.category.create({
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
        totalStudents: stats.totalStudents,
        searchVolume: stats.searchVolume,
        demandScore,
        supplyScore,
        competitionIndex: calculateCompetitionIndex(demandScore, supplyScore),
        growthRate,
        trendDirection: determineTrendDirection(growthRate),
        avgRating: stats.avgRating,
        avgReviews: stats.avgReviews,
        source: 'Udemy Scraping + Google Trends',
      },
    })
    categorySlugToId[cat.slug] = created.id
  }

  // Udemy scraping'den gelen kurslari kaydet
  for (const [, catData] of udemyData) {
    const categoryId = categorySlugToId[catData.slug]
    if (!categoryId) continue

    for (const course of catData.courses) {
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
          demandScore: course.demandScore || 5,
          supplyScore: course.supplyScore || 5,
          opportunityScore: calculateOpportunityScore(course.demandScore || 5, course.supplyScore || 5),
          tags: course.tags,
          type: 'course',
          avgMonthlyEnroll: course.avgMonthlyEnroll || 0,
          priceRange: course.price > 70 ? 'premium' : course.price > 30 ? 'mid' : 'budget',
          isTrending: course.isTrending,
          instructor: course.instructor,
          url: course.url,
        },
      }).catch((err) => console.error(`[Udemy] Kurs kaydetme hatasi: ${course.name}`, err.message))
    }
  }

  // Trend verisini kaydet
  await saveTrendData(platform, trendResults)

  // Insightlari olustur
  await generateInsights(platform, allCategoryStats, trendResults)
}

/**
 * Capafy verilerini Google Trends + Capafy scraping ile yeniler
 */
async function refreshCapafy() {
  const platform: Platform = 'capafy'
  const categories = PLATFORM_CATEGORIES.capafy

  // Eski verileri temizle
  await db.$transaction([
    db.productIdea.deleteMany({ where: { platform } }),
    db.searchTrend.deleteMany({ where: { platform } }),
    db.marketInsight.deleteMany({ where: { platform } }),
    db.product.deleteMany({ where: { platform } }),
    db.category.deleteMany({ where: { platform } }),
  ])

  // Google Trends verilerini cek
  const allSearchTerms = categories.flatMap((cat) => getSearchTermsForCategory(cat.slug, 'capafy'))
  const trendResults = await fetchMultipleTrends(allSearchTerms)

  // Capafy scraping ile gercek urun verilerini cek
  const capafySlugs = categories.map((c) => c.slug)
  const capafyData = await fetchAllCapafyCategories(capafySlugs)

  // Kategorileri olustur
  const categorySlugToId: Record<string, string> = {}
  const allCategoryStats: CategoryStats[] = []

  for (const cat of categories) {
    const scraped = capafyData.get(cat.slug)
    const trend = trendResults.get(getSearchTermsForCategory(cat.slug, 'capafy')[0])

    const totalProducts = scraped?.totalProducts || 100
    const avgPrice = scraped?.avgPrice || 30
    const avgRating = scraped?.avgRating || 4.5
    const avgReviews = scraped?.avgReviews || 50
    const searchVolume = trend?.avgVolume || 30000
    const growthRate = trend?.growthRate || 25

    allCategoryStats.push({
      avgPrice,
      totalProducts,
      totalRevenue: totalProducts * avgPrice * 50,
      searchVolume,
      avgRating,
      avgReviews,
      totalStudents: 0,
    })
  }

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    const stats = allCategoryStats[i]
    const demandScore = calculateDemandScore(stats, allCategoryStats)
    const supplyScore = calculateSupplyScore(stats, allCategoryStats)

    const created = await db.category.create({
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
        searchVolume: stats.searchVolume,
        demandScore,
        supplyScore,
        competitionIndex: calculateCompetitionIndex(demandScore, supplyScore),
        growthRate,
        trendDirection: determineTrendDirection(growthRate),
        avgRating: stats.avgRating,
        avgReviews: stats.avgReviews,
        source: 'Capafy Scraping + Google Trends',
      },
    })
    categorySlugToId[cat.slug] = created.id
  }

  // Capafy scraping'den gelen urunleri kaydet
  for (const [, catData] of capafyData) {
    const categoryId = categorySlugToId[catData.slug]
    if (!categoryId) continue

    for (const product of catData.products) {
      await db.product.create({
        data: {
          platform,
          name: product.name,
          categoryId,
          price: product.price,
          salesCount: product.salesCount,
          revenue: Math.round(product.price * product.salesCount),
          rating: product.rating,
          reviewCount: product.reviewCount,
          demandScore: product.demandScore || 5,
          supplyScore: product.supplyScore || 5,
          opportunityScore: calculateOpportunityScore(product.demandScore || 5, product.supplyScore || 5),
          tags: product.tags,
          type: 'other',
          avgMonthlySales: product.avgMonthlySales || 0,
          priceRange: product.price > 50 ? 'premium' : product.price > 20 ? 'mid' : 'budget',
          isTrending: product.isTrending,
          creator: product.creator,
          url: product.url,
        },
      }).catch((err) => console.error(`[Capafy] Urun kaydetme hatasi: ${product.name}`, err.message))
    }
  }

  // Trend verisini kaydet
  await saveTrendData(platform, trendResults)

  // Insightlari olustur
  await generateInsights(platform, allCategoryStats, trendResults)
}

/**
 * Gercek verilere gore insight (icgoru) olusturur
 */
async function generateInsights(
  platform: Platform,
  allStats: CategoryStats[],
  trendResults: Map<string, TrendResult>
) {
  const insights: { title: string; description: string; insightType: string; impactScore: number; source: string }[] = []

  // En hizli buyuyen kategori
  const sortedByGrowth = [...allStats].sort((a, b) => b.searchVolume - a.searchVolume)
  if (sortedByGrowth.length > 0) {
    const top = sortedByGrowth[0]
    insights.push({
      title: `${platform === 'udemy' ? 'Kurs' : 'Urun'} Talebi En Yuksek Kategori`,
      description: `Toplam ${top.searchVolume.toLocaleString()} aylik arama hacmi ile en cok talep goren kategori. Google Trends verilerine gore bu kategorideki talep diger kategorilere gore %${Math.round((top.searchVolume / (sortedByGrowth[1]?.searchVolume || 1) - 1) * 100)} daha yuksek.`,
      insightType: 'opportunity',
      impactScore: Math.round((top.searchVolume / sortedByGrowth[0].searchVolume) * 10 * 10) / 10,
      source: 'Google Trends + Platform Verileri',
    })
  }

  // Buyume orani analizi
  for (const [keyword, trend] of trendResults) {
    if (trend.growthRate > 30) {
      insights.push({
        title: `"${keyword}" Arama Hacmi ${trend.growthRate}% Buyuyor`,
        description: `Son 12 ayda "${keyword}" aramalari %${trend.growthRate} artis gosterdi. En yuksek hacim ${trend.peakMonth} tarihinde olculdu. Bu trend devam ederse onumuzdeki 6 ayda talep daha da artacak.`,
        insightType: 'opportunity',
        impactScore: Math.min(trend.growthRate / 10, 10),
        source: 'Google Trends',
      })
    } else if (trend.growthRate < -10) {
      insights.push({
        title: `"${keyword}" Talebi Dususte -${Math.abs(trend.growthRate)}%`,
        description: `Son 12 ayda "${keyword}" aramalari %${Math.abs(trend.growthRate)} azaldi. Bu kategoride yeni urun cikarmak icin dogru zaman olmayabilir.`,
        insightType: 'warning',
        impactScore: Math.min(Math.abs(trend.growthRate) / 10, 8),
        source: 'Google Trends',
      })
    }
  }

  // Doymus pazar uyarisi
  for (const stats of allStats) {
    const supplyScore = calculateSupplyScore(stats, allStats)
    if (supplyScore > 7.5) {
      insights.push({
        title: 'Yuksek Rekabet Uyarisi',
        description: `${stats.totalProducts.toLocaleString()} adet urun ile bu kategori dogmus durumda. Yeni girenler icin farklilastirma sart.`,
        insightType: 'warning',
        impactScore: 7.5,
        source: 'Platform Verileri',
      })
    } else if (supplyScore < 3.0) {
      insights.push({
        title: 'Dusuk Rekabet - Buyuk Firsat',
        description: `Rekabetin cok dusuk oldugu bu kategoride ilk hamle avantaji var. Az sayida urun var ama talep yuksek.`,
        insightType: 'opportunity',
        impactScore: 9.0,
        source: 'Platform Verileri',
      })
    }
  }

  // Insightlari kaydet
  for (const insight of insights) {
    try {
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
    } catch {}
  }
}

/**
 * Belirtilen platformu yeniler
 */
export async function refreshPlatform(platform: Platform): Promise<{ platform: Platform; status: 'success' | 'error'; duration: number; message: string }> {
  const start = Date.now()
  try {
    switch (platform) {
      case 'gumroad': await refreshGumroad(); break
      case 'udemy': await refreshUdemy(); break
      case 'capafy': await refreshCapafy(); break
    }

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
 * Tum platformlari yeniler
 */
export async function refreshAllPlatforms(): Promise<{ platform: Platform; status: 'success' | 'error'; duration: number; message: string }[]> {
  // In-memory cache temizle
  const globalCache = globalThis as unknown as { refreshCache?: Map<string, { data: unknown; timestamp: number }> }
  if (globalCache.refreshCache) {
    globalCache.refreshCache.clear()
  }

  const results = await Promise.all([
    refreshPlatform('gumroad'),
    refreshPlatform('udemy'),
    refreshPlatform('capafy'),
  ])

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
