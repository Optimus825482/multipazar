import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Find products with high demand but low supply (opportunities)
    const opportunities = await db.product.findMany({
      where: {
        demandScore: { gte: 8.0 },
        supplyScore: { lte: 4.0 },
      },
      include: { category: true },
      orderBy: { opportunityScore: 'desc' },
    })

    // Categories with high demand/low supply
    const categoryOpportunities = await db.category.findMany({
      where: {
        demandScore: { gte: 8.0 },
        supplyScore: { lte: 5.0 },
      },
      orderBy: { growthRate: 'desc' },
    })

    // Calculate opportunity gap
    const opportunityGaps = categoryOpportunities.map((c) => ({
      ...c,
      gapScore: Math.round((c.demandScore - c.supplyScore) * 10) / 10,
      estimatedMonthlyDemand: Math.round(c.searchVolume * 0.12),
      estimatedMonthlySupply: Math.round(c.totalProducts * 0.08),
      unmetDemand: Math.round(c.searchVolume * 0.12 - c.totalProducts * 0.08),
    }))

    // Product ideas based on gaps
    const productIdeas = [
      {
        name: "Multi-AI Model Prompt Framework",
        category: "AI Prompt Paketleri",
        estimatedPrice: 29.99,
        estimatedMonthlySales: 2000,
        estimatedMonthlyRevenue: 59980,
        demandScore: 9.6,
        supplyScore: 1.8,
        gapScore: 9.7,
        difficulty: "Orta",
        timeToCreate: "1-2 hafta",
        reason: "ChatGPT, Claude, Gemini ve Midjourney icin kapsamli prompt frameworki. Pazarda cok az kapsamli urun var.",
      },
      {
        name: "SaaS Revenue Dashboard Notion",
        category: "Notion Sablonlari",
        estimatedPrice: 34.99,
        estimatedMonthlySales: 800,
        estimatedMonthlyRevenue: 27992,
        demandScore: 9.3,
        supplyScore: 2.5,
        gapScore: 9.1,
        difficulty: "Orta",
        timeToCreate: "2-3 hafta",
        reason: "SaaS girisimleri icin ozel gelir takip dashboardu. Mevcut urunlerde bu ni$ bos.",
      },
      {
        name: "AI-Powered Copywriting Toolkit",
        category: "Yazi ve Kopyalama",
        estimatedPrice: 24.99,
        estimatedMonthlySales: 1200,
        estimatedMonthlyRevenue: 29988,
        demandScore: 9.2,
        supplyScore: 2.2,
        gapScore: 9.3,
        difficulty: "Kolay",
        timeToCreate: "1 hafta",
        reason: "AI destekli kopya yazma araclarina talep %42.6 buyumeyle artiyor. Arz cok sinirli.",
      },
      {
        name: "Startup Pitch Deck Pro Kit",
        category: "Is ve Girisimcilik",
        estimatedPrice: 49.99,
        estimatedMonthlySales: 500,
        estimatedMonthlyRevenue: 24995,
        demandScore: 9.1,
        supplyScore: 2.0,
        gapScore: 9.4,
        difficulty: "Zor",
        timeToCreate: "2-4 hafta",
        reason: "Startup ekosisteminde pitch deck araclari icin buyuk acik. Talep yuksek, arz neredeyse yok.",
      },
      {
        name: "Complete SaaS Admin Dashboard UI",
        category: "UI/UX Tasarim Kaynaklari",
        estimatedPrice: 69.99,
        estimatedMonthlySales: 350,
        estimatedMonthlyRevenue: 24497,
        demandScore: 9.0,
        supplyScore: 2.3,
        gapScore: 9.2,
        difficulty: "Zor",
        timeToCreate: "3-4 hafta",
        reason: "Premium SaaS dashboard UI kitleri $60+ fiyata satiliyor ve talep arzi gecmis durumda.",
      },
      {
        name: "Wellness & Mental Health Planner",
        category: "Saglik ve Wellness",
        estimatedPrice: 19.99,
        estimatedMonthlySales: 1500,
        estimatedMonthlyRevenue: 29985,
        demandScore: 8.5,
        supplyScore: 3.5,
        gapScore: 8.8,
        difficulty: "Kolay",
        timeToCreate: "1 hafta",
        reason: "Mental wellness urunlerine talep hizla artiyor. Dijital journal ve planner formatinda firsat var.",
      },
      {
        name: "Chrome Extension AI Assistant Kit",
        category: "Yazilim ve Araclar",
        estimatedPrice: 59.99,
        estimatedMonthlySales: 400,
        estimatedMonthlyRevenue: 23996,
        demandScore: 9.1,
        supplyScore: 2.8,
        gapScore: 9.0,
        difficulty: "Zor",
        timeToCreate: "2-3 hafta",
        reason: "AI destekli Chrome extensionlar icin starter kit. Teknik bilgi gerektiren ancak yuksek marjli urun.",
      },
      {
        name: "Content Creator Full Toolkit",
        category: "Notion Sablonlari",
        estimatedPrice: 39.99,
        estimatedMonthlySales: 650,
        estimatedMonthlyRevenue: 25994,
        demandScore: 9.2,
        supplyScore: 3.1,
        gapScore: 9.1,
        difficulty: "Orta",
        timeToCreate: "2 hafta",
        reason: "Icerik olusturucular icin tum ihtiyaclari karsilayan all-in-one Notion sistemi.",
      },
    ]

    return NextResponse.json({
      products: opportunities,
      categories: opportunityGaps,
      productIdeas,
      summary: {
        totalOpportunities: opportunities.length,
        avgGapScore: opportunityGaps.length > 0
          ? Math.round(opportunityGaps.reduce((s, c) => s + c.gapScore, 0) / opportunityGaps.length * 10) / 10
          : 0,
        topCategoryGaps: opportunityGaps.slice(0, 3).map((c) => ({ name: c.name, gap: c.gapScore })),
      },
    })
  } catch (error) {
    console.error('Opportunities API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
