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

    // Cross-platform comparison data
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
        commissionRate: 63, // Udemy organic: 37% to instructor
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
        commissionRate: 20, // Estimated Capafy commission
        topGrowthCategory: capafyRes?.categories ? [...capafyRes.categories].sort((a: any, b: any) => b.growthRate - a.growthRate)[0] : null,
        lowestCompetition: capafyRes?.categories ? [...capafyRes.categories].sort((a: any, b: any) => a.competitionIndex - b.competitionIndex)[0] : null,
        bestOpportunity: capafyRes?.categories ? [...capafyRes.categories].sort((a: any, b: any) => (b.demandScore - b.supplyScore) - (a.demandScore - a.supplyScore))[0] : null,
      },
    ]

    // Cross-market opportunity themes (topics that are hot across multiple platforms)
    const crossMarketOpportunities = [
      {
        theme: "AI Prompt Engineering & Tools",
        gumroad: { category: "AI Prompt Paketleri", demand: 9.6, supply: 2.8, growth: 68.4, avgPrice: 19 },
        udemy: { category: "Veri Bilimi & AI/ML", demand: 9.8, supply: 6.2, growth: 45.2, avgPrice: 94 },
        capafy: { category: "AI Prompt Mühendisligi", demand: 9.8, supply: 3.5, growth: 72.5, avgPrice: 12 },
        recommendation: "Capafy ve Gumroad'da dusuk fiyatla yuksek hacim, Udemy'de premium kurs ile yuksek gelir.",
        bestPlatform: "Udemy + Capafy (cift platform)",
        potentialRevenue: "$15,000 - $50,000/ay",
      },
      {
        theme: "AI Otomasyon & Workflow",
        gumroad: { category: "Yazilim Gelistirme", demand: 9.3, supply: 4.1, growth: 35.7, avgPrice: 67 },
        udemy: { category: "IT & Sertifika", demand: 9.2, supply: 5.8, growth: 28.6, avgPrice: 109 },
        capafy: { category: "AI Otomasyon & Workflow", demand: 9.6, supply: 2.8, growth: 58.3, avgPrice: 29 },
        recommendation: "Capafy'da otomasyon sablonlari, Gumroad'da SaaS starter kit, Udemy'de sertifika kursu.",
        bestPlatform: "Capafy (en dusuk rekabet)",
        potentialRevenue: "$10,000 - $40,000/ay",
      },
      {
        theme: "Kisisel Gelistirme & Productivity",
        gumroad: { category: "Notion Sablonlari", demand: 9.4, supply: 6.5, growth: 23.5, avgPrice: 22 },
        udemy: { category: "Kisisel Gelisim", demand: 8.9, supply: 8.8, growth: 12.4, avgPrice: 69 },
        capafy: { category: "AI Egitim & Ogrenme", demand: 8.6, supply: 2.8, growth: 42.1, avgPrice: 20 },
        recommendation: "Gumroad Notion sablonlari hala karli, Udemy'de cok rekabetli, Capafy'da AI ogrenme araclari firsat.",
        bestPlatform: "Gumroad + Capafy",
        potentialRevenue: "$5,000 - $20,000/ay",
      },
      {
        theme: "Video Icerik & Production",
        gumroad: { category: "Fotografcilik ve Video", demand: 8.2, supply: 6.0, growth: 19.3, avgPrice: 22 },
        udemy: { category: "Foto & Video Prod", demand: 8.0, supply: 7.2, growth: 14.2, avgPrice: 79 },
        capafy: { category: "AI Video Uretimi", demand: 9.4, supply: 2.0, growth: 85.2, avgPrice: 28 },
        recommendation: "Capafy'de AI video uretim skill'leri devasa firsat. Gumroad/Udemy'de rekabet yuksek.",
        bestPlatform: "Capafy (en yuksek buyume %85)",
        potentialRevenue: "$8,000 - $35,000/ay",
      },
      {
        theme: "Tasarim & UI/UX",
        gumroad: { category: "Grafik Tasarim", demand: 8.5, supply: 7.8, growth: 15.6, avgPrice: 25 },
        udemy: { category: "Tasarim & Grafik", demand: 8.4, supply: 7.5, growth: 18.3, avgPrice: 79 },
        capafy: { category: "AI Grafik & Tasarim", demand: 8.8, supply: 5.5, growth: 32.5, avgPrice: 16 },
        recommendation: "Capafy'da AI tasarim araclarinin buyume potansiyeli yuksek. Gumroad/Udemy'de cok rekabet var.",
        bestPlatform: "Capafy ( orta rekabet, yuksek buyume)",
        potentialRevenue: "$5,000 - $25,000/ay",
      },
      {
        theme: "Yazilim & Web Gelistirme",
        gumroad: { category: "Yazilim Gelistirme", demand: 9.3, supply: 4.1, growth: 35.7, avgPrice: 67 },
        udemy: { category: "Yazilim Gelistirme", demand: 9.7, supply: 8.5, growth: 22.4, avgPrice: 89 },
        capafy: { category: "AI Kod Yazma Asistanlari", demand: 9.7, supply: 3.2, growth: 65.2, avgPrice: 24 },
        recommendation: "3 platformda da guclu talep. Gumroad'da boilerplate, Udemy'de bootcamp, Capafy'da AI coding skill.",
        bestPlatform: "Udemy (en yuksek hacim) + Capafy (en yuksek buyume)",
        potentialRevenue: "$20,000 - $80,000/ay",
      },
    ]

    // Platform comparison metrics
    const comparisonMetrics = [
      {
        metric: 'Ort. Buyume Orani',
        gumroad: gumroadRes?.overview?.avgGrowthRate || 0,
        udemy: udemyRes?.overview?.avgGrowthRate || 0,
        capafy: capafyRes?.overview?.avgGrowthRate || 0,
        best: 'capafy',
      },
      {
        metric: 'Ort. Talep Skoru',
        gumroad: gumroadRes?.categories ? Math.round(gumroadRes.categories.reduce((s: number, c: any) => s + c.demandScore, 0) / gumroadRes.categories.length * 10) / 10 : 0,
        udemy: udemyRes?.categories ? Math.round(udemyRes.categories.reduce((s: number, c: any) => s + c.demandScore, 0) / udemyRes.categories.length * 10) / 10 : 0,
        capafy: capafyRes?.categories ? Math.round(capafyRes.categories.reduce((s: number, c: any) => s + c.demandScore, 0) / capafyRes.categories.length * 10) / 10 : 0,
        best: 'capafy',
      },
      {
        metric: 'Ort. Rekabet (dusuk = iyi)',
        gumroad: gumroadRes?.categories ? Math.round(gumroadRes.categories.reduce((s: number, c: any) => s + c.competitionIndex, 0) / gumroadRes.categories.length * 10) / 10 : 0,
        udemy: udemyRes?.categories ? Math.round(udemyRes.categories.reduce((s: number, c: any) => s + c.competitionIndex, 0) / udemyRes.categories.length * 10) / 10 : 0,
        capafy: capafyRes?.categories ? Math.round(capafyRes.categories.reduce((s: number, c: any) => s + c.competitionIndex, 0) / capafyRes.categories.length * 10) / 10 : 0,
        best: 'capafy',
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

    // Platform strength analysis
    const platformStrengths = [
      {
        platform: 'Gumroad',
        strengths: ['En dusuk komisyon (%10)', 'Yuksek fiyat esnekligi', 'Direct customer relationship', 'Digital product ecosystem'],
        weaknesses: ['Organik trafik sinirli', 'Marketing ihtiyaci yuksek', 'Dusuk hacim'],
        bestFor: 'Premium dijital urunler ($25-100 araligi), sablonlar, rehberler',
        earningPotential: '$5,000 - $30,000/ay (deneyimli satıcılar)',
      },
      {
        platform: 'Udemy',
        strengths: ['Massive traffic (62M+ ogrenci)', 'Built-in marketing', 'Corporate training channel', 'Kurumsal B2B firsatlar'],
        weaknesses: ['Yuksek komisyon (%63 organic)', 'Fiyat discountlara bagimli', 'Cok yuksek rekabet', 'Puanlama sistemi zor'],
        bestFor: 'Kapsamli teknik kurslar, sertifika hazirlik, AI/ML egitimi',
        earningPotential: '$2,000 - $15,000/ay (basarili egitmenler)',
      },
      {
        platform: 'Capafy AI',
        strengths: ['En hizli buyuyen pazar', 'Dusuk rekabet', 'AI niche odakli', 'Hizli urun olusturma'],
        weaknesses: ['Yeni pazar (risk)', 'Kucuk muhtemel musteri tabani', 'Platform olgunlugu', 'Urun cesitliligi sinirli'],
        bestFor: 'AI skillleri, prompt paketleri, AI otomasyon sablonlari',
        earningPotential: '$3,000 - $25,000/ay (erken giris avantaji)',
      },
    ]

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
