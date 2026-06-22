import { NextResponse } from 'next/server'
import { getPlatformDataFromDB } from '@/data/helpers'

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000

function getCached(key: string) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data
  }
  return null
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

export async function GET() {
  try {
    const cached = getCached('compare-data-v2')
    if (cached) return NextResponse.json(cached)

    // DOGRUDAN veri katmanindan cek - kendine HTTP istegi atmak yerine
    // Bu, gereksiz ag/serilestirme maliyetini onler ve BASE_URL yanlisligina karsi dayaniklidir.
    const [gumroadData, udemyData, capafyData] = await Promise.all([
      getPlatformDataFromDB('gumroad').catch(() => null),
      getPlatformDataFromDB('udemy').catch(() => null),
      getPlatformDataFromDB('capafy').catch(() => null),
    ])

    if (!gumroadData && !udemyData && !capafyData) {
      return NextResponse.json({ error: 'All marketplace data unavailable' }, { status: 500 })
    }

    // Ham DB verilerini isle
    const gumroadCats = gumroadData?.categories ?? []
    const udemyCats = udemyData?.categories ?? []
    const capafyCats = capafyData?.categories ?? []

    const gumroadOverview = gumroadData ? {
      totalRevenue: (gumroadCats as any[]).reduce((s: number, c: any) => s + (c.totalRevenue || 0), 0),
      totalProducts: (gumroadCats as any[]).reduce((s: number, c: any) => s + (c.totalProducts || 0), 0),
      totalSearchVolume: (gumroadCats as any[]).reduce((s: number, c: any) => s + (c.searchVolume || 0), 0),
      avgGrowthRate: gumroadCats.length > 0
        ? (gumroadCats as any[]).reduce((s: number, c: any) => s + (c.growthRate || 0), 0) / gumroadCats.length
        : 0,
      totalCategories: gumroadCats.length,
    } : null

    const udemyOverview = udemyData ? {
      totalRevenue: (udemyCats as any[]).reduce((s: number, c: any) => s + (c.totalRevenue || 0), 0),
      totalCourses: (udemyCats as any[]).reduce((s: number, c: any) => s + (c.totalProducts || 0), 0),
      totalSearchVolume: (udemyCats as any[]).reduce((s: number, c: any) => s + (c.searchVolume || 0), 0),
      avgGrowthRate: udemyCats.length > 0
        ? (udemyCats as any[]).reduce((s: number, c: any) => s + (c.growthRate || 0), 0) / udemyCats.length
        : 0,
      totalCategories: udemyCats.length,
      avgPrice: udemyCats.length > 0
        ? Math.round((udemyCats as any[]).reduce((s: number, c: any) => s + (c.avgPrice || 0), 0) / udemyCats.length)
        : 0,
    } : null

    const capafyOverview = capafyData ? {
      totalRevenue: (capafyCats as any[]).reduce((s: number, c: any) => s + (c.totalRevenue || 0), 0),
      totalProducts: (capafyCats as any[]).reduce((s: number, c: any) => s + (c.totalProducts || 0), 0),
      totalSearchVolume: (capafyCats as any[]).reduce((s: number, c: any) => s + (c.searchVolume || 0), 0),
      avgGrowthRate: capafyCats.length > 0
        ? (capafyCats as any[]).reduce((s: number, c: any) => s + (c.growthRate || 0), 0) / capafyCats.length
        : 0,
      totalCategories: capafyCats.length,
      avgPrice: capafyCats.length > 0
        ? Math.round((capafyCats as any[]).reduce((s: number, c: any) => s + (c.avgPrice || 0), 0) / capafyCats.length)
        : 0,
    } : null

    // Cross-platform comparison
    const platforms = [
      {
        name: 'Gumroad',
        color: '#f97316',
        icon: 'ShoppingCart',
        type: 'Dijital Urun Pazaryeri',
        overview: gumroadOverview,
        avgPrice: gumroadCats.length > 0
          ? Math.round((gumroadCats as any[]).reduce((s: number, c: any) => s + (c.avgPrice || 0), 0) / gumroadCats.length)
          : 0,
        commissionRate: 10,
        topGrowthCategory: [...(gumroadCats as any[])].sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))[0] || null,
        lowestCompetition: [...(gumroadCats as any[])].sort((a, b) => (a.competitionIndex || 0) - (b.competitionIndex || 0))[0] || null,
        bestOpportunity: [...(gumroadCats as any[])].sort(
          (a, b) => ((b.demandScore || 0) - (b.supplyScore || 0)) - ((a.demandScore || 0) - (a.supplyScore || 0))
        )[0] || null,
      },
      {
        name: 'Udemy',
        color: '#8b5cf6',
        icon: 'GraduationCap',
        type: 'Online Kurs Platformu',
        overview: udemyOverview,
        avgPrice: udemyCats.length > 0
          ? Math.round((udemyCats as any[]).reduce((s: number, c: any) => s + (c.avgPrice || 0), 0) / udemyCats.length)
          : 0,
        commissionRate: 63,
        topGrowthCategory: [...(udemyCats as any[])].sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))[0] || null,
        lowestCompetition: [...(udemyCats as any[])].sort((a, b) => (a.competitionIndex || 0) - (b.competitionIndex || 0))[0] || null,
        bestOpportunity: [...(udemyCats as any[])].sort(
          (a, b) => ((b.demandScore || 0) - (b.supplyScore || 0)) - ((a.demandScore || 0) - (a.supplyScore || 0))
        )[0] || null,
      },
      {
        name: 'Capafy AI',
        color: '#06b6d4',
        icon: 'Bot',
        type: 'AI Skill Pazaryeri',
        overview: capafyOverview,
        avgPrice: capafyCats.length > 0
          ? Math.round((capafyCats as any[]).reduce((s: number, c: any) => s + (c.avgPrice || 0), 0) / capafyCats.length)
          : 0,
        commissionRate: 20,
        topGrowthCategory: [...(capafyCats as any[])].sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0))[0] || null,
        lowestCompetition: [...(capafyCats as any[])].sort((a, b) => (a.competitionIndex || 0) - (b.competitionIndex || 0))[0] || null,
        bestOpportunity: [...(capafyCats as any[])].sort(
          (a, b) => ((b.demandScore || 0) - (b.supplyScore || 0)) - ((a.demandScore || 0) - (a.supplyScore || 0))
        )[0] || null,
      },
    ]

    // Comparison metrics berechnung
    const gumroadDemandAvg = gumroadCats.length > 0
      ? Math.round((gumroadCats as any[]).reduce((s: number, c: any) => s + (c.demandScore || 0), 0) / gumroadCats.length * 10) / 10
      : 0
    const udemyDemandAvg = udemyCats.length > 0
      ? Math.round((udemyCats as any[]).reduce((s: number, c: any) => s + (c.demandScore || 0), 0) / udemyCats.length * 10) / 10
      : 0
    const capafyDemandAvg = capafyCats.length > 0
      ? Math.round((capafyCats as any[]).reduce((s: number, c: any) => s + (c.demandScore || 0), 0) / capafyCats.length * 10) / 10
      : 0

    const gumroadCompAvg = gumroadCats.length > 0
      ? Math.round((gumroadCats as any[]).reduce((s: number, c: any) => s + (c.competitionIndex || 0), 0) / gumroadCats.length * 10) / 10
      : 0
    const udemyCompAvg = udemyCats.length > 0
      ? Math.round((udemyCats as any[]).reduce((s: number, c: any) => s + (c.competitionIndex || 0), 0) / udemyCats.length * 10) / 10
      : 0
    const capafyCompAvg = capafyCats.length > 0
      ? Math.round((capafyCats as any[]).reduce((s: number, c: any) => s + (c.competitionIndex || 0), 0) / capafyCats.length * 10) / 10
      : 0

    function getBestPlatform(v1?: number, v2?: number, v3?: number): string {
      const a = v1 || 0; const b = v2 || 0; const c = v3 || 0
      if (a >= b && a >= c) return 'gumroad'
      if (b >= a && b >= c) return 'udemy'
      return 'capafy'
    }

    const comparisonMetrics = [
      {
        metric: 'Ort. Buyume Orani',
        gumroad: gumroadOverview?.avgGrowthRate || 0,
        udemy: udemyOverview?.avgGrowthRate || 0,
        capafy: capafyOverview?.avgGrowthRate || 0,
        best: getBestPlatform(gumroadOverview?.avgGrowthRate, udemyOverview?.avgGrowthRate, capafyOverview?.avgGrowthRate),
      },
      {
        metric: 'Ort. Talep Skoru',
        gumroad: gumroadDemandAvg,
        udemy: udemyDemandAvg,
        capafy: capafyDemandAvg,
        best: getBestPlatform(gumroadDemandAvg, udemyDemandAvg, capafyDemandAvg),
      },
      {
        metric: 'Ort. Rekabet (dusuk = iyi)',
        gumroad: gumroadCompAvg,
        udemy: udemyCompAvg,
        capafy: capafyCompAvg,
        best: getBestPlatform(-gumroadCompAvg, -udemyCompAvg, -capafyCompAvg),
      },
      {
        metric: 'Ort. Fiyat',
        gumroad: gumroadCats.length > 0
          ? Math.round((gumroadCats as any[]).reduce((s: number, c: any) => s + (c.avgPrice || 0), 0) / gumroadCats.length)
          : 0,
        udemy: udemyOverview?.avgPrice || 0,
        capafy: capafyOverview?.avgPrice || 0,
        best: 'udemy',
      },
      {
        metric: 'Komisyon Orani (dusuk = iyi)',
        gumroad: 10,
        udemy: 63,
        capafy: 20,
        best: 'gumroad',
      },
    ]

    // Cross-market opportunities
    const crossMarketOpportunities = buildCrossMarketOpportunities(gumroadCats, udemyCats, capafyCats)

    // Platform strengths
    const platformStrengths = buildPlatformStrengths(gumroadOverview, udemyOverview, capafyOverview)

    const result = {
      platforms,
      crossMarketOpportunities,
      comparisonMetrics,
      platformStrengths,
      lastUpdated: new Date().toISOString(),
    }

    setCache('compare-data-v2', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Compare API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function buildCrossMarketOpportunities(gumroadCats: any[], udemyCats: any[], capafyCats: any[]): any[] {
  const themes = [
    {
      theme: 'AI Prompt Engineering & Tools',
      recommendedProduct: 'Prompt paketi + mini otomasyon workflow + uygulama rehberi',
      nextAction: 'En dusuk rekabetli platformda MVP listele; ayni konuyu egitim/rehber formatina cevirerek ikinci platformda test et.',
      categories: [
        { platform: 'gumroad', label: 'Gumroad', cat: findCategory(gumroadCats, ['ai-prompts']) },
        { platform: 'udemy', label: 'Udemy', cat: findCategory(udemyCats, ['data-science-ai']) },
        { platform: 'capafy', label: 'Capafy', cat: findCategory(capafyCats, ['prompt-engineering']) },
      ],
    },
    {
      theme: 'AI Otomasyon & Workflow',
      recommendedProduct: 'n8n/Zapier/agent otomasyon sablonu + kurulum dokumani',
      nextAction: 'Tekrarlayan is akislarini urunlestir; once hazir template, sonra kurs veya premium kit olarak genislet.',
      categories: [
        { platform: 'gumroad', label: 'Gumroad', cat: findCategory(gumroadCats, ['software-development', 'ai-prompts']) },
        { platform: 'udemy', label: 'Udemy', cat: findCategory(udemyCats, ['it-certification', 'software-development']) },
        { platform: 'capafy', label: 'Capafy', cat: findCategory(capafyCats, ['ai-automation']) },
      ],
    },
    {
      theme: 'Yazilim & Web Gelistirme',
      recommendedProduct: 'SaaS boilerplate, starter kit, kod uretim yardimcisi veya pratik bootcamp',
      nextAction: 'Arz yogunlugunu kontrol et; spesifik niche secip Gumroad kit + Udemy egitim hunisi kur.',
      categories: [
        { platform: 'gumroad', label: 'Gumroad', cat: findCategory(gumroadCats, ['software-development']) },
        { platform: 'udemy', label: 'Udemy', cat: findCategory(udemyCats, ['software-development']) },
        { platform: 'capafy', label: 'Capafy', cat: findCategory(capafyCats, ['ai-development']) },
      ],
    },
    {
      theme: 'AI Video / Image / Content Production',
      recommendedProduct: 'Uretim workflow paketi, prompt presetleri, asset/template seti',
      nextAction: 'Cikti kalitesi gosterilebilen kucuk paketle basla; talep dogrulanirsa egitim ve premium template ekle.',
      categories: [
        { platform: 'gumroad', label: 'Gumroad', cat: findCategory(gumroadCats, ['video-production', 'design-graphics']) },
        { platform: 'udemy', label: 'Udemy', cat: findCategory(udemyCats, ['design', 'photography']) },
        { platform: 'capafy', label: 'Capafy', cat: findCategory(capafyCats, ['ai-video-generation', 'ai-image-generation']) },
      ],
    },
  ]

  return themes
    .map((theme) => buildRealOpportunity(theme))
    .filter((opportunity): opportunity is NonNullable<typeof opportunity> => Boolean(opportunity))
    .sort((a, b) => b.priorityScore - a.priorityScore)
}

function findCategory(categories: any[], slugs: string[]): any | null {
  return slugs.map((slug) => categories.find((category) => category.slug === slug)).find(Boolean) || null
}

function toPlatformSignal(entry: { platform: string; label: string; cat: any | null }) {
  if (!entry.cat) return null

  const gapScore = Math.round(((entry.cat.demandScore || 0) - (entry.cat.supplyScore || 0)) * 10) / 10
  const priorityScore = calculateCategoryPriority(entry.cat)

  return {
    platform: entry.platform,
    label: entry.label,
    category: entry.cat.name,
    slug: entry.cat.slug,
    demand: entry.cat.demandScore || 0,
    supply: entry.cat.supplyScore || 0,
    gapScore,
    growth: entry.cat.growthRate || 0,
    avgPrice: entry.cat.avgPrice || 0,
    totalProducts: entry.cat.totalProducts || 0,
    searchVolume: entry.cat.searchVolume || 0,
    competitionIndex: entry.cat.competitionIndex || 0,
    priorityScore,
  }
}

type PlatformSignal = NonNullable<ReturnType<typeof toPlatformSignal>>

function isPlatformSignal(signal: ReturnType<typeof toPlatformSignal>): signal is PlatformSignal {
  return signal !== null
}

function buildRealOpportunity(theme: {
  theme: string
  recommendedProduct: string
  nextAction: string
  categories: { platform: string; label: string; cat: any | null }[]
}) {
  const signals = theme.categories.map(toPlatformSignal).filter(isPlatformSignal)

  if (signals.length === 0) return null

  const bestSignal = [...signals].sort((a, b) => b.priorityScore - a.priorityScore)[0]
  const avgPriority = signals.reduce((sum, signal) => sum + signal.priorityScore, 0) / signals.length
  const priorityScore = Math.round((avgPriority + bestSignal.priorityScore) / 2 * 10) / 10

  return {
    theme: theme.theme,
    signals,
    evidenceCount: signals.length,
    priorityScore,
    bestPlatform: bestSignal.label,
    bestCategory: bestSignal.category,
    gumroad: signals.find((signal) => signal.platform === 'gumroad') || null,
    udemy: signals.find((signal) => signal.platform === 'udemy') || null,
    capafy: signals.find((signal) => signal.platform === 'capafy') || null,
    recommendedProduct: theme.recommendedProduct,
    nextAction: theme.nextAction,
    recommendation: `${bestSignal.label} / ${bestSignal.category}: talep ${bestSignal.demand}, arz ${bestSignal.supply}, gap ${bestSignal.gapScore}.`,
  }
}

function calculateCategoryPriority(category: any): number {
  const demand = category.demandScore || 0
  const supply = category.supplyScore || 0
  const growth = Math.max(-20, Math.min(category.growthRate || 0, 80))
  const competition = category.competitionIndex || 10
  const gap = Math.max(0, demand - supply)

  const score =
    demand * 0.35 +
    gap * 0.25 +
    ((growth + 20) / 100) * 10 * 0.2 +
    (10 - competition) * 0.2

  return Math.round(Math.max(0, Math.min(score, 10)) * 10) / 10
}

function buildPlatformStrengths(gumroadOverview: any, udemyOverview: any, capafyOverview: any): any[] {
  const platformInputs = [
    {
      platform: 'Gumroad',
      overview: gumroadOverview,
      strengths: ['Dusuk komisyon', 'Fiyat esnekligi', 'Musteri iliskisi dogrudan kurulabilir', 'Template/kit satmaya uygun'],
      weaknesses: ['Organik trafik sinirli', 'Pazarlama sorumlulugu sende', 'Guven insasi gerekir'],
      bestFor: 'Premium dijital urunler, sablonlar, rehberler, boilerplate ve asset kitleri',
    },
    {
      platform: 'Udemy',
      overview: udemyOverview,
      strengths: ['Hazir egitim talebi', 'Arama niyeti yuksek kullanici', 'Kurs formatinda guven olusturma'],
      weaknesses: ['Cloudflare/scraping kisiti nedeniyle veri erisimi zor', 'Yuksek rekabet', 'Fiyatlama platform kampanyalarina bagimli'],
      bestFor: 'Kapsamli teknik kurslar, sertifika hazirliklari, urun kitinin egitim versiyonu',
    },
    {
      platform: 'Capafy AI',
      overview: capafyOverview,
      strengths: ['AI niche odagi', 'Skill/agent formatina uygun', 'Hizli MVP cikarma imkani'],
      weaknesses: ['Yeni pazar riski', 'Talep hacmi platform olgunluguna bagli', 'Kategori sinyalleri yakindan izlenmeli'],
      bestFor: 'AI skillleri, prompt paketleri, agent workflowlari, otomasyon sablonlari',
    },
  ]

  return platformInputs.map((item) => ({
    platform: item.platform,
    strengths: item.strengths,
    weaknesses: item.weaknesses,
    bestFor: item.bestFor,
    dataStatus: item.overview?.totalCategories > 0 ? 'real-data' : 'no-current-data',
    observedCategories: item.overview?.totalCategories || 0,
    observedGrowthRate: item.overview?.avgGrowthRate || 0,
    observedSearchVolume: item.overview?.totalSearchVolume || 0,
  }))
}
