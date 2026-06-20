export const GUMROAD_PRODUCT_IDEAS = [
  {
    name: "Multi-AI Model Prompt Framework (ChatGPT+Claude+Gemini)",
    category: "AI Prompt Paketleri",
    estimatedPrice: 34.99,
    estimatedMonthlySales: 2000,
    estimatedMonthlyRevenue: 69980,
    demandScore: 9.6,
    supplyScore: 1.8,
    gapScore: 9.7,
    difficulty: "Orta",
    timeToCreate: "1-2 hafta",
    reason: "AI kategorisi en hizli buyume (%68). Aylik $500-$1,500 gelir potansiyeli. Gercek referans: inchristie.gumroad.com/l/mastermidjourney ($59, 3,200+ satis). Pazarda cok az kapsamli multi-model frameworku var.",
    sourceUrl: "https://insightraider.com/en/answers/what-digital-products-sell-best-on-gumroad",
  },
  {
    name: "Notion Template Creator Dashboard Pro",
    category: "Notion Sablonlari",
    estimatedPrice: 49.00,
    estimatedMonthlySales: 500,
    estimatedMonthlyRevenue: 24500,
    demandScore: 9.1,
    supplyScore: 2.8,
    gapScore: 9.1,
    difficulty: "Orta",
    timeToCreate: "2-3 hafta",
    reason: "Notion sablonlari %46.3 kazanma oranina sahip. Gercek referans: mrbio.gumroad.com/l/template-creator-dashboard ($49, 2,900+ satis). Template olusturucu araclarina talep yuksek.",
    sourceUrl: "https://mrbio.gumroad.com/l/template-creator-dashboard",
  },
  {
    name: "AI Digital Product Builder Toolkit",
    category: "Yazilim Gelistirme",
    estimatedPrice: 39.00,
    estimatedMonthlySales: 800,
    estimatedMonthlyRevenue: 31200,
    demandScore: 9.3,
    supplyScore: 3.1,
    gapScore: 9.0,
    difficulty: "Zor",
    timeToCreate: "3-4 hafta",
    reason: "Yazilim en yuksek gelirli kategori ($65.8M). Gercek referans: sharyph.gumroad.com/l/ai-digital-product-builder ($29, 3,800+ satis). AI ile urun olusturma trendi hizla buyuyor.",
    sourceUrl: "https://sharyph.gumroad.com/l/ai-digital-product-builder",
  },
  {
    name: "Freelancer High-Ticket Service Starter Kit",
    category: "Is ve Para",
    estimatedPrice: 97.00,
    estimatedMonthlySales: 300,
    estimatedMonthlyRevenue: 29100,
    demandScore: 8.5,
    supplyScore: 1.8,
    gapScore: 9.2,
    difficulty: "Orta",
    timeToCreate: "2 hafta",
    reason: "Gumroad'da $97+ freelancer/consultant kit'ler cok az. Gercek referans: mbakry.gumroad.com ($97). High-ticket niche buyuk firsat sunuyor.",
    sourceUrl: "https://mbakry.gumroad.com/l/AI-Brand-Messaging-Service-Kit-Freelancer-And-Consultants-Edition",
  },
  {
    name: "Midjourney Monetization Masterclass",
    category: "AI Prompt Paketleri",
    estimatedPrice: 59.00,
    estimatedMonthlySales: 400,
    estimatedMonthlyRevenue: 23600,
    demandScore: 9.6,
    supplyScore: 2.5,
    gapScore: 9.5,
    difficulty: "Orta",
    timeToCreate: "2-3 hafta",
    reason: "Gumroad urun: inchristie.gumroad.com/l/mastermidjourney ($59, 3,200+ satis). AI sanat kurslarinda %68 buyume var.",
    sourceUrl: "https://inchristie.gumroad.com/l/mastermidjourney",
  },
  {
    name: "SaaS Boilerplate + AI Integration Kit",
    category: "Yazilim Gelistirme",
    estimatedPrice: 79.00,
    estimatedMonthlySales: 350,
    estimatedMonthlyRevenue: 27650,
    demandScore: 9.3,
    supplyScore: 4.1,
    gapScore: 8.8,
    difficulty: "Zor",
    timeToCreate: "4-6 hafta",
    reason: "Yazilim kategorisi $60,814 avg urun geliri ile en karli. AI entegre SaaS starter kitleri cok az urunle buyuk firsat.",
    sourceUrl: "https://insightraider.com/en/answers/what-digital-products-sell-best-on-gumroad",
  },
]

export const GUMROAD_DATA_SOURCES = [
  { name: "InsightRaider.com", desc: "Gumroad kategori gelir verileri (Haz 2026)", url: "https://insightraider.com/en/answers/what-digital-products-sell-best-on-gumroad" },
  { name: "Reddit r/DigitalProductEmpir", desc: "200K+ urun izleme analizi", url: "https://www.reddit.com/r/DigitalProductEmpir/comments/1sbg775" },
  { name: "ConversionProPlus", desc: "2026 Gumroad trend raporu", url: "https://conversionproplus.com/blog/gumroad-trends-2026-what-s-selling-right-now" },
  { name: "DigitalApplied", desc: "AI dijital urun gelir tahminleri", url: "https://www.digitalapplied.com/blog/ai-digital-products-templates-workflows-sell-guide" },
  { name: "Sacra", desc: "Gumroad platform gelir/valyasyon", url: "https://sacra.com/c/gumroad" },
  { name: "Gumroad.com", desc: "Gercek urun listeleri", url: "https://gumroad.com/discover" },
]

// Category slug -> categoryId mapping for product assignments
export const GUMROAD_CATEGORY_SLUG_MAP: Record<string, string> = {
  "notion-templates": "software-development", // will be resolved at runtime
  "ai-prompts": "ai-prompts",
  "software-development": "software-development",
  "business-money": "business-money",
  "3d-assets": "3d-assets",
  "graphic-design": "graphic-design",
  "online-courses": "online-courses",
  "photography-video": "photography-video",
}

export function getGumroadCategorySlug(productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('notion')) return 'notion-templates'
  if (lower.includes('ai') || lower.includes('midjourney') || lower.includes('prompt')) return 'ai-prompts'
  if (lower.includes('saas') || lower.includes('boilerplate') || lower.includes('submachine') || lower.includes('premiere')) return 'software-development'
  if (lower.includes('blender') || lower.includes('low poly') || lower.includes('3d') || lower.includes('character')) return '3d-assets'
  if (lower.includes('brand messaging') || lower.includes('freelancer')) return 'business-money'
  return 'software-development'
}
