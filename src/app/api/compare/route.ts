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
  const opportunities: any[] = []

  const getCat = (cats: any[], slug: string) => cats?.find((c: any) => c.slug === slug)

  const gumroadAi = getCat(gumroadCats, 'ai-prompts')
  const udemyAi = getCat(udemyCats, 'data-science-ai')
  const capafyAi = getCat(capafyCats, 'prompt-engineering')

  if (gumroadAi || udemyAi || capafyAi) {
    opportunities.push({
      theme: 'AI Prompt Engineering & Tools',
      gumroad: { category: gumroadAi?.name || 'AI Prompt Paketleri', demand: gumroadAi?.demandScore || 9.0, supply: gumroadAi?.supplyScore || 5.0, growth: gumroadAi?.growthRate || 20, avgPrice: gumroadAi?.avgPrice || 19 },
      udemy: { category: udemyAi?.name || 'Veri Bilimi & AI/ML', demand: udemyAi?.demandScore || 9.0, supply: udemyAi?.supplyScore || 5.0, growth: udemyAi?.growthRate || 20, avgPrice: udemyAi?.avgPrice || 94 },
      capafy: { category: capafyAi?.name || 'Prompt Muhendisligi', demand: capafyAi?.demandScore || 9.0, supply: capafyAi?.supplyScore || 3.0, growth: capafyAi?.growthRate || 30, avgPrice: capafyAi?.avgPrice || 12 },
      recommendation: 'Capafy ve Gumroad\'da dusuk fiyatla yuksek hacim, Udemy\'de premium kurs ile yuksek gelir.',
      bestPlatform: 'Udemy + Capafy (cift platform)',
      potentialRevenue: '$15,000 - $50,000/ay',
    })
  }

  const capafyAutomation = getCat(capafyCats, 'ai-automation')
  if (capafyAutomation || gumroadAi) {
    opportunities.push({
      theme: 'AI Otomasyon & Workflow',
      gumroad: { category: 'Yazilim Gelistirme', demand: 8.5, supply: 4.0, growth: 20, avgPrice: 67 },
      udemy: { category: 'IT & Sertifika', demand: 8.5, supply: 5.0, growth: 20, avgPrice: 109 },
      capafy: { category: capafyAutomation?.name || 'AI Otomasyon', demand: capafyAutomation?.demandScore || 9.0, supply: capafyAutomation?.supplyScore || 3.0, growth: capafyAutomation?.growthRate || 30, avgPrice: capafyAutomation?.avgPrice || 29 },
      recommendation: 'Capafy\'da otomasyon sablonlari, Gumroad\'da SaaS starter kit, Udemy\'de sertifika kursu.',
      bestPlatform: 'Capafy (en dusuk rekabet)',
      potentialRevenue: '$10,000 - $40,000/ay',
    })
  }

  const capafyVideo = getCat(capafyCats, 'ai-video-generation')
  if (capafyVideo) {
    opportunities.push({
      theme: 'Video Icerik & Production',
      gumroad: { category: 'Video Production', demand: 8.0, supply: 6.0, growth: 15, avgPrice: 22 },
      udemy: { category: 'Foto & Video', demand: 8.0, supply: 7.0, growth: 14, avgPrice: 79 },
      capafy: { category: capafyVideo.name, demand: capafyVideo.demandScore || 8.5, supply: capafyVideo.supplyScore || 3.0, growth: capafyVideo.growthRate || 30, avgPrice: capafyVideo.avgPrice || 15 },
      recommendation: 'Capafy\'de AI video uretim skill\'leri buyuk firsat.',
      bestPlatform: 'Capafy (en yuksek buyume)',
      potentialRevenue: '$8,000 - $35,000/ay',
    })
  }

  const gumroadSoftware = getCat(gumroadCats, 'software-development')
  const udemySoftware = getCat(udemyCats, 'software-development')
  if (gumroadSoftware || udemySoftware) {
    opportunities.push({
      theme: 'Yazilim & Web Gelistirme',
      gumroad: { category: gumroadSoftware?.name || 'Yazilim', demand: gumroadSoftware?.demandScore || 9.0, supply: gumroadSoftware?.supplyScore || 4.0, growth: gumroadSoftware?.growthRate || 20, avgPrice: gumroadSoftware?.avgPrice || 67 },
      udemy: { category: udemySoftware?.name || 'Yazilim', demand: udemySoftware?.demandScore || 9.0, supply: udemySoftware?.supplyScore || 7.0, growth: udemySoftware?.growthRate || 20, avgPrice: udemySoftware?.avgPrice || 89 },
      capafy: { category: 'AI Kod Yazma', demand: 9.5, supply: 3.0, growth: 35, avgPrice: 24 },
      recommendation: '3 platformda da guclu talep. Gumroad\'da boilerplate, Udemy\'de bootcamp, Capafy\'da AI coding skill.',
      bestPlatform: 'Udemy (en yuksek hacim) + Capafy (en yuksek buyume)',
      potentialRevenue: '$20,000 - $80,000/ay',
    })
  }

  return opportunities
}

function buildPlatformStrengths(gumroadOverview: any, udemyOverview: any, capafyOverview: any): any[] {
  const gumroadGrowth = gumroadOverview?.avgGrowthRate || 0
  const udemyGrowth = udemyOverview?.avgGrowthRate || 0
  const capafyGrowth = capafyOverview?.avgGrowthRate || 0

  return [
    {
      platform: 'Gumroad',
      strengths: ['En dusuk komisyon (%10)', 'Yuksek fiyat esnekligi', 'Direct customer relationship', 'Digital product ecosystem'],
      weaknesses: ['Organik trafik sinirli', 'Marketing ihtiyaci yuksek', 'Dusuk hacim'],
      bestFor: 'Premium dijital urunler ($25-100 araligi), sablonlar, rehberler',
      earningPotential: `$${(gumroadGrowth * 200).toLocaleString()} - $${(gumroadGrowth * 1000).toLocaleString()}/ay (tahmini)`,
    },
    {
      platform: 'Udemy',
      strengths: ['Massive traffic (62M+ ogrenci)', 'Built-in marketing', 'Corporate training channel', 'Kurumsal B2B firsatlar'],
      weaknesses: ['Yuksek komisyon (%63 organic)', 'Fiyat discountlara bagimli', 'Cok yuksek rekabet', 'Puanlama sistemi zor'],
      bestFor: 'Kapsamli teknik kurslar, sertifika hazirlik, AI/ML egitimi',
      earningPotential: `$${Math.round(udemyGrowth * 100).toLocaleString()} - $${Math.round(udemyGrowth * 500).toLocaleString()}/ay (tahmini)`,
    },
    {
      platform: 'Capafy AI',
      strengths: ['En hizli buyuyen pazar', 'Dusuk rekabet', 'AI niche odakli', 'Hizli urun olusturma'],
      weaknesses: ['Yeni pazar (risk)', 'Kucuk musteri tabani', 'Platform olgunlugu', 'Urun cesitliligi sinirli'],
      bestFor: 'AI skillleri, prompt paketleri, AI otomasyon sablonlari',
      earningPotential: `$${Math.round(capafyGrowth * 150).toLocaleString()} - $${Math.round(capafyGrowth * 800).toLocaleString()}/ay (tahmini)`,
    },
  ]
}
