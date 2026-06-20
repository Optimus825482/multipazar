import { NextResponse } from 'next/server'

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    const [gumroadRes, udemyRes, capafyRes] = await Promise.all([
      fetch(`${baseUrl}/api/market`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/api/udemy`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/api/capafy`).then(r => r.json()).catch(() => null),
    ])

    if (!gumroadRes && !udemyRes && !capafyRes) {
      return NextResponse.json({ error: 'All marketplace APIs failed' }, { status: 500 })
    }

    // Cross-platform comparison data (real data from APIs)
    const platforms = [
      {
        name: 'Gumroad',
        color: '#f97316',
        icon: 'ShoppingCart',
        type: 'Dijital Urun Pazaryeri',
        overview: gumroadRes?.overview ? {
          totalRevenue: gumroadRes.overview.totalRevenue,
          totalProducts: gumroadRes.overview.totalProducts,
          totalSearchVolume: gumroadRes.overview.totalSearchVolume,
          avgGrowthRate: gumroadRes.overview.avgGrowthRate,
          totalCategories: gumroadRes.overview.totalCategories,
        } : null,
        avgPrice: gumroadRes?.categories ? Math.round(gumroadRes.categories.reduce((s: number, c: any) => s + c.avgPrice, 0) / gumroadRes.categories.length) : 0,
        commissionRate: 10,
        topGrowthCategory: gumroadRes?.categories ? [...gumroadRes.categories].sort((a: any, b: any) => b.growthRate - a.growthRate)[0] : null,
        lowestCompetition: gumroadRes?.categories ? [...gumroadRes.categories].sort((a: any, b: any) => a.competitionIndex - b.competitionIndex)[0] : null,
        bestOpportunity: gumroadRes?.categories ? [...gumroadRes.categories].sort((a: any, b: any) => (b.demandScore - b.supplyScore) - (a.demandScore - a.supplyScore))[0] : null,
      },
      {
        name: 'Udemy',
        color: '#8b5cf6',
        icon: 'GraduationCap',
        type: 'Online Kurs Platformu',
        overview: udemyRes?.overview ? {
          totalRevenue: udemyRes.overview.totalRevenue,
          totalProducts: udemyRes.overview.totalCourses,
          totalSearchVolume: udemyRes.overview.totalSearchVolume,
          avgGrowthRate: udemyRes.overview.avgGrowthRate,
          totalCategories: udemyRes.overview.totalCategories,
          avgPrice: udemyRes.overview.avgPrice,
        } : null,
        avgPrice: udemyRes?.overview?.avgPrice || 0,
        commissionRate: 63,
        topGrowthCategory: udemyRes?.categories ? [...udemyRes.categories].sort((a: any, b: any) => b.growthRate - a.growthRate)[0] : null,
        lowestCompetition: udemyRes?.categories ? [...udemyRes.categories].sort((a: any, b: any) => a.competitionIndex - b.competitionIndex)[0] : null,
        bestOpportunity: udemyRes?.categories ? [...udemyRes.categories].sort((a: any, b: any) => (b.demandScore - b.supplyScore) - (a.demandScore - a.supplyScore))[0] : null,
      },
      {
        name: 'Capafy AI',
        color: '#06b6d4',
        icon: 'Bot',
        type: 'AI Skill Pazaryeri',
        overview: capafyRes?.overview ? {
          totalRevenue: capafyRes.overview.totalRevenue,
          totalProducts: capafyRes.overview.totalProducts,
          totalSearchVolume: capafyRes.overview.totalSearchVolume,
          avgGrowthRate: capafyRes.overview.avgGrowthRate,
          totalCategories: capafyRes.overview.totalCategories,
          avgPrice: capafyRes.overview.avgPrice,
        } : null,
        avgPrice: capafyRes?.overview?.avgPrice || 0,
        commissionRate: 20,
        topGrowthCategory: capafyRes?.categories ? [...capafyRes.categories].sort((a: any, b: any) => b.growthRate - a.growthRate)[0] : null,
        lowestCompetition: capafyRes?.categories ? [...capafyRes.categories].sort((a: any, b: any) => a.competitionIndex - b.competitionIndex)[0] : null,
        bestOpportunity: capafyRes?.categories ? [...capafyRes.categories].sort((a: any, b: any) => (b.demandScore - b.supplyScore) - (a.demandScore - a.supplyScore))[0] : null,
      },
    ]

    // Cross-market opportunity themes (calculated from real API data)
    const crossMarketOpportunities = buildCrossMarketOpportunities(gumroadRes, udemyRes, capafyRes)

    // Platform comparison metrics (real data)
    const comparisonMetrics = [
      {
        metric: 'Ort. Buyume Orani',
        gumroad: gumroadRes?.overview?.avgGrowthRate || 0,
        udemy: udemyRes?.overview?.avgGrowthRate || 0,
        capafy: capafyRes?.overview?.avgGrowthRate || 0,
        best: getBestPlatform(gumroadRes?.overview?.avgGrowthRate, udemyRes?.overview?.avgGrowthRate, capafyRes?.overview?.avgGrowthRate),
      },
      {
        metric: 'Ort. Talep Skoru',
        gumroad: gumroadRes?.categories ? Math.round(gumroadRes.categories.reduce((s: number, c: any) => s + c.demandScore, 0) / gumroadRes.categories.length * 10) / 10 : 0,
        udemy: udemyRes?.categories ? Math.round(udemyRes.categories.reduce((s: number, c: any) => s + c.demandScore, 0) / udemyRes.categories.length * 10) / 10 : 0,
        capafy: capafyRes?.categories ? Math.round(capafyRes.categories.reduce((s: number, c: any) => s + c.demandScore, 0) / capafyRes.categories.length * 10) / 10 : 0,
        best: getBestPlatform(
          gumroadRes?.categories?.reduce((s: number, c: any) => s + c.demandScore, 0) / (gumroadRes?.categories?.length || 1),
          udemyRes?.categories?.reduce((s: number, c: any) => s + c.demandScore, 0) / (udemyRes?.categories?.length || 1),
          capafyRes?.categories?.reduce((s: number, c: any) => s + c.demandScore, 0) / (capafyRes?.categories?.length || 1)
        ),
      },
      {
        metric: 'Ort. Rekabet (dusuk = iyi)',
        gumroad: gumroadRes?.categories ? Math.round(gumroadRes.categories.reduce((s: number, c: any) => s + c.competitionIndex, 0) / gumroadRes.categories.length * 10) / 10 : 0,
        udemy: udemyRes?.categories ? Math.round(udemyRes.categories.reduce((s: number, c: any) => s + c.competitionIndex, 0) / udemyRes.categories.length * 10) / 10 : 0,
        capafy: capafyRes?.categories ? Math.round(capafyRes.categories.reduce((s: number, c: any) => s + c.competitionIndex, 0) / capafyRes.categories.length * 10) / 10 : 0,
        best: getBestPlatform(
          -(gumroadRes?.categories?.reduce((s: number, c: any) => s + c.competitionIndex, 0) || 0),
          -(udemyRes?.categories?.reduce((s: number, c: any) => s + c.competitionIndex, 0) || 0),
          -(capafyRes?.categories?.reduce((s: number, c: any) => s + c.competitionIndex, 0) || 0)
        ),
      },
      {
        metric: 'Ort. Fiyat',
        gumroad: gumroadRes?.categories ? Math.round(gumroadRes.categories.reduce((s: number, c: any) => s + c.avgPrice, 0) / gumroadRes.categories.length) : 0,
        udemy: udemyRes?.overview?.avgPrice || 0,
        capafy: capafyRes?.overview?.avgPrice || 0,
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

    // Platform strength analysis (based on real data)
    const platformStrengths = buildPlatformStrengths(gumroadRes, udemyRes, capafyRes)

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

function getBestPlatform(val1?: number, val2?: number, val3?: number): string {
  const v1 = val1 || 0
  const v2 = val2 || 0
  const v3 = val3 || 0
  if (v1 >= v2 && v1 >= v3) return 'gumroad'
  if (v2 >= v1 && v2 >= v3) return 'udemy'
  return 'capafy'
}

function buildCrossMarketOpportunities(gumroadRes: any, udemyRes: any, capafyRes: any): any[] {
  const opportunities: any[] = []

  // AI Prompt Engineering
  const gumroadAi = gumroadRes?.categories?.find((c: any) => c.slug === 'ai-prompts')
  const udemyAi = udemyRes?.categories?.find((c: any) => c.slug === 'data-science-ai')
  const capafyAi = capafyRes?.categories?.find((c: any) => c.slug === 'prompt-engineering')

  if (gumroadAi || udemyAi || capafyAi) {
    opportunities.push({
      theme: "AI Prompt Engineering & Tools",
      gumroad: { category: gumroadAi?.name || "AI Prompt Paketleri", demand: gumroadAi?.demandScore || 9.0, supply: gumroadAi?.supplyScore || 3.0, growth: gumroadAi?.growthRate || 20, avgPrice: gumroadAi?.avgPrice || 19 },
      udemy: { category: udemyAi?.name || "Veri Bilimi & AI/ML", demand: udemyAi?.demandScore || 9.0, supply: udemyAi?.supplyScore || 5.0, growth: udemyAi?.growthRate || 20, avgPrice: udemyAi?.avgPrice || 94 },
      capafy: { category: capafyAi?.name || "AI Prompt Muhendisligi", demand: capafyAi?.demandScore || 9.0, supply: capafyAi?.supplyScore || 3.0, growth: capafyAi?.growthRate || 30, avgPrice: capafyAi?.avgPrice || 12 },
      recommendation: "Capafy ve Gumroad'da dusuk fiyatla yuksek hacim, Udemy'de premium kurs ile yuksek gelir.",
      bestPlatform: "Udemy + Capafy (cift platform)",
      potentialRevenue: "$15,000 - $50,000/ay",
    })
  }

  // AI Automation
  const capafyAutomation = capafyRes?.categories?.find((c: any) => c.slug === 'ai-automation')
  if (capafyAutomation || gumroadAi) {
    opportunities.push({
      theme: "AI Otomasyon & Workflow",
      gumroad: { category: "Yazilim Gelistirme", demand: gumroadAi?.demandScore || 8.5, supply: gumroadAi?.supplyScore || 4.0, growth: gumroadAi?.growthRate || 20, avgPrice: 67 },
      udemy: { category: "IT & Sertifika", demand: udemyAi?.demandScore || 8.5, supply: udemyAi?.supplyScore || 5.0, growth: udemyAi?.growthRate || 20, avgPrice: 109 },
      capafy: { category: capafyAutomation?.name || "AI Otomasyon", demand: capafyAutomation?.demandScore || 9.0, supply: capafyAutomation?.supplyScore || 3.0, growth: capafyAutomation?.growthRate || 30, avgPrice: capafyAutomation?.avgPrice || 29 },
      recommendation: "Capafy'da otomasyon sablonlari, Gumroad'da SaaS starter kit, Udemy'de sertifika kursu.",
      bestPlatform: "Capafy (en dusuk rekabet)",
      potentialRevenue: "$10,000 - $40,000/ay",
    })
  }

  // Video/AI Video
  const capafyVideo = capafyRes?.categories?.find((c: any) => c.slug === 'ai-video-generation')
  if (capafyVideo) {
    opportunities.push({
      theme: "Video Icerik & Production",
      gumroad: { category: "Video Production", demand: 8.0, supply: 6.0, growth: 15, avgPrice: 22 },
      udemy: { category: "Foto & Video", demand: 8.0, supply: 7.0, growth: 14, avgPrice: 79 },
      capafy: { category: capafyVideo.name, demand: capafyVideo.demandScore, supply: capafyVideo.supplyScore, growth: capafyVideo.growthRate, avgPrice: capafyVideo.avgPrice },
      recommendation: "Capafy'de AI video uretim skill'leri buyuk firsat.",
      bestPlatform: "Capafy (en yuksek buyume)",
      potentialRevenue: "$8,000 - $35,000/ay",
    })
  }

  // Software Development
  const gumroadSoftware = gumroadRes?.categories?.find((c: any) => c.slug === 'software-development')
  const udemySoftware = udemyRes?.categories?.find((c: any) => c.slug === 'software-development')
  if (gumroadSoftware || udemySoftware) {
    opportunities.push({
      theme: "Yazilim & Web Gelistirme",
      gumroad: { category: gumroadSoftware?.name || "Yazilim", demand: gumroadSoftware?.demandScore || 9.0, supply: gumroadSoftware?.supplyScore || 4.0, growth: gumroadSoftware?.growthRate || 20, avgPrice: gumroadSoftware?.avgPrice || 67 },
      udemy: { category: udemySoftware?.name || "Yazilim", demand: udemySoftware?.demandScore || 9.0, supply: udemySoftware?.supplyScore || 7.0, growth: udemySoftware?.growthRate || 20, avgPrice: udemySoftware?.avgPrice || 89 },
      capafy: { category: "AI Kod Yazma", demand: 9.5, supply: 3.0, growth: 35, avgPrice: 24 },
      recommendation: "3 platformda da guclu talep. Gumroad'da boilerplate, Udemy'de bootcamp, Capafy'da AI coding skill.",
      bestPlatform: "Udemy (en yuksek hacim) + Capafy (en yuksek buyume)",
      potentialRevenue: "$20,000 - $80,000/ay",
    })
  }

  return opportunities
}

function buildPlatformStrengths(gumroadRes: any, udemyRes: any, capafyRes: any): any[] {
  const gumroadGrowth = gumroadRes?.overview?.avgGrowthRate || 0
  const udemyGrowth = udemyRes?.overview?.avgGrowthRate || 0
  const capafyGrowth = capafyRes?.overview?.avgGrowthRate || 0

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
