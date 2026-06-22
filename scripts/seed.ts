import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log("Seeding database for SQLite...")

  // Temizlik
  await db.productIdea.deleteMany()
  await db.searchTrend.deleteMany()
  await db.marketInsight.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.refreshLog.deleteMany()

  // ===================== GUMROAD =====================
  console.log("--- Seeding Gumroad ---")

  const gumCategories = [
    { name: "Notion Sablonlari", slug: "notion-templates", description: "Notion icin productivity sablonlari, dashboard, CRM, is takip sistemleri", icon: "LayoutTemplate", color: "#f97316", avgPrice: 22.00, totalProducts: 8900, totalCourses: 0, totalRevenue: 28400000, searchVolume: 185000, demandScore: 9.4, supplyScore: 6.5, competitionIndex: 5.8, growthRate: 23.5, trendDirection: "up", source: "Reddit - 46.3% make money, avg $9,986 revenue" },
    { name: "Online Kurslar", slug: "online-courses", description: "Dijital kurslar, egitim videolari, workshop kayitlari ve ogrenme paketleri", icon: "GraduationCap", color: "#6366f1", avgPrice: 49.00, totalProducts: 3100, totalCourses: 0, totalRevenue: 25600000, searchVolume: 142000, demandScore: 9.2, supplyScore: 5.8, competitionIndex: 5.0, growthRate: 31.2, trendDirection: "up", source: "ConversionProPlus - Short courses performing best" },
    { name: "eBooklar ve Rehberler", slug: "ebooks-guides", description: "Dijital kitaplar, kisa rehberler, kilavuzlar ve el kitaplari", icon: "BookOpen", color: "#06b6d4", avgPrice: 14.00, totalProducts: 15600, totalCourses: 0, totalRevenue: 18200000, searchVolume: 98000, demandScore: 7.8, supplyScore: 8.2, competitionIndex: 7.5, growthRate: 12.8, trendDirection: "stable", source: "Quora - eBooks most common on Gumroad" },
    { name: "Yazilim Gelistirme", slug: "software-development", description: "SaaS starter kitleri, boilerplate'lar, API sablonlari", icon: "Code", color: "#10b981", avgPrice: 67.00, totalProducts: 4280, totalCourses: 0, totalRevenue: 65800000, searchVolume: 89000, demandScore: 9.3, supplyScore: 4.1, competitionIndex: 3.5, growthRate: 35.7, trendDirection: "up", source: "InsightRaider - $65.8M total revenue" },
    { name: "AI Prompt Paketleri", slug: "ai-prompts", description: "ChatGPT, Midjourney, DALL-E, Claude icin prompt koleksiyonlari", icon: "Bot", color: "#f43f5e", avgPrice: 19.00, totalProducts: 3200, totalCourses: 0, totalRevenue: 14800000, searchVolume: 112000, demandScore: 9.6, supplyScore: 2.8, competitionIndex: 2.1, growthRate: 68.4, trendDirection: "up", source: "DigitalApplied - AI products earn $500-$1,500/mo" },
    { name: "3D Varliklar", slug: "3d-assets", description: "3D modeller, Blender sablonlari, VRChat avatarlari", icon: "Box", color: "#8b5cf6", avgPrice: 29.00, totalProducts: 12400, totalCourses: 0, totalRevenue: 42100000, searchVolume: 52000, demandScore: 8.1, supplyScore: 6.2, competitionIndex: 5.5, growthRate: 18.4, trendDirection: "up", source: "InsightRaider - $42.1M revenue" },
    { name: "Grafik Tasarim", slug: "graphic-design", description: "Fontlar, ikon paketleri, Figma sablonlari", icon: "Palette", color: "#ec4899", avgPrice: 25.00, totalProducts: 39800, totalCourses: 0, totalRevenue: 38500000, searchVolume: 68000, demandScore: 8.5, supplyScore: 7.8, competitionIndex: 7.2, growthRate: 15.6, trendDirection: "up", source: "Reddit - ~40,000 products" },
  ]

  const gumSlugToId: Record<string, string> = {}
  for (const cat of gumCategories) {
    const created = await db.category.create({ data: { platform: 'gumroad', ...cat } })
    gumSlugToId[cat.slug] = created.id
  }
  console.log(`  Created ${gumCategories.length} categories`)

  const gumProducts = [
    { name: "Notion Template Creator Dashboard", slug: "notion-templates", price: 49.00, salesCount: 2900, rating: 4.9, reviewCount: 420, demandScore: 9.1, supplyScore: 2.8, tags: "notion,dashboard", type: "template", avgMonthlySales: 242, priceRange: "premium", isTrending: true },
    { name: "AI Digital Product Builder", slug: "software-development", price: 29.00, salesCount: 3800, rating: 4.7, reviewCount: 520, demandScore: 9.3, supplyScore: 3.1, tags: "ai,digital product", type: "software", avgMonthlySales: 317, priceRange: "mid", isTrending: true },
  ]
  for (const p of gumProducts) {
    await db.product.create({
      data: { platform: 'gumroad', name: p.name, categoryId: gumSlugToId[p.slug]!, price: p.price, salesCount: p.salesCount, revenue: Math.round(p.price * p.salesCount), rating: p.rating, reviewCount: p.reviewCount, demandScore: p.demandScore, supplyScore: p.supplyScore, opportunityScore: Math.max(0, Math.round((p.demandScore * 10 - p.supplyScore * 8) * 10) / 10), tags: p.tags, type: p.type, avgMonthlySales: p.avgMonthlySales, priceRange: p.priceRange, isTrending: p.isTrending, gumroadUrl: `gumroad.com/l/${p.name.toLowerCase().replace(/\s+/g, '-')}` },
    })
  }
  console.log(`  Created ${gumProducts.length} products`)

  // Insights
  await db.marketInsight.create({ data: { platform: 'gumroad', title: "AI Prompt Paketleri %68 Buyume ile Patlama Yasiyor", description: "InsightRaider verilerine gore AI prompt kategorisi en hizli buyuyen niche.", insightType: "opportunity", impactScore: 9.6, source: "InsightRaider" } })
  await db.marketInsight.create({ data: { platform: 'gumroad', title: "Yazilim Gelistirme En Yuksek Gelirli Kategori ($65.8M)", description: "InsightRaider'in 2026 verisine gore Software Development en yuksek toplam geliri getiriyor.", insightType: "opportunity", impactScore: 9.5, source: "InsightRaider" } })
  console.log(`  Created 2 insights`)

  // ===================== UDEMY =====================
  // Udemy artik desteklenmiyor (ToS riski + Puppeteer maliyeti).
  // Sadece Gumroad + Capafy AI pazar verileri kullaniliyor.

  // ===================== CAPAFY =====================
  console.log("--- Seeding Capafy ---")

  const capafyCategories = [
    { name: "AI Prompt Mühendisligi", slug: "prompt-engineering", description: "ChatGPT, Claude, Midjourney prompt sablonlari", icon: "Bot", color: "#f43f5e", avgPrice: 12.00, totalProducts: 4500, totalCourses: 0, totalRevenue: 8500000, searchVolume: 480000, demandScore: 9.8, supplyScore: 3.5, competitionIndex: 2.8, growthRate: 72.5, trendDirection: "up", avgRating: 4.3, avgReviews: 120, source: "PromptBase 2025" },
    { name: "AI Otomasyon & Workflow", slug: "ai-automation", description: "Zapier AI, n8n, AI agent pipeline", icon: "Workflow", color: "#8b5cf6", avgPrice: 29.00, totalProducts: 2200, totalCourses: 0, totalRevenue: 12800000, searchVolume: 320000, demandScore: 9.6, supplyScore: 2.8, competitionIndex: 2.2, growthRate: 58.3, trendDirection: "up", avgRating: 4.5, avgReviews: 280, source: "Make.com/Zapier AI trends" },
    { name: "AI Chatbot & Agent", slug: "ai-chatbot-agents", description: "Custom GPT, RAG pipeline, LangChain", icon: "MessageSquare", color: "#a855f7", avgPrice: 35.00, totalProducts: 2100, totalCourses: 0, totalRevenue: 14200000, searchVolume: 350000, demandScore: 9.5, supplyScore: 3.0, competitionIndex: 2.5, growthRate: 62.8, trendDirection: "up", avgRating: 4.4, avgReviews: 260, source: "OpenAI GPT Store" },
  ]

  const capafySlugToId: Record<string, string> = {}
  for (const cat of capafyCategories) {
    const created = await db.category.create({ data: { platform: 'capafy', ...cat } })
    capafySlugToId[cat.slug] = created.id
  }
  console.log(`  Created ${capafyCategories.length} categories`)

  const capafyProducts = [
    { name: "ChatGPT Mega Prompt Library", slug: "prompt-engineering", creator: "PromptMaster", price: 9.99, salesCount: 12500, rating: 4.6, reviewCount: 890, demandScore: 9.8, supplyScore: 3.2, tags: "chatgpt,prompts", avgMonthlySales: 1040, isTrending: true },
    { name: "AI Agent Builder Kit", slug: "ai-chatbot-agents", creator: "DevAI Tools", price: 39.99, salesCount: 4500, rating: 4.8, reviewCount: 380, demandScore: 9.7, supplyScore: 2.0, tags: "ai-agent,langchain", avgMonthlySales: 520, isTrending: true },
  ]
  for (const p of capafyProducts) {
    await db.product.create({
      data: { platform: 'capafy', name: p.name, categoryId: capafySlugToId[p.slug]!, price: p.price, salesCount: p.salesCount, revenue: Math.round(p.price * p.salesCount), rating: p.rating, reviewCount: p.reviewCount, demandScore: p.demandScore, supplyScore: p.supplyScore, opportunityScore: Math.max(0, Math.round((p.demandScore * 10 - p.supplyScore * 8) * 10) / 10), tags: p.tags, type: 'other', avgMonthlySales: p.avgMonthlySales, isTrending: p.isTrending, creator: p.creator },
    })
  }
  console.log(`  Created ${capafyProducts.length} products`)

  // Refresh log
  await db.refreshLog.create({
    data: { platform: 'all', status: 'success', duration: 0, message: 'Initial seed completed' },
  })

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
