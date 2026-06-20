// Udemy product ideas use estimatedMonthlyEnroll instead of estimatedMonthlySales
export const UDEMY_PRODUCT_IDEAS = [
  {
    name: "AI Agent Development with LangChain & CrewAI Masterclass",
    category: "Veri Bilimi & AI/ML",
    estimatedPrice: 94.99,
    estimatedMonthlySales: 8000,
    estimatedMonthlyEnroll: 8000,
    estimatedMonthlyRevenue: 759920,
    demandScore: 9.8,
    supplyScore: 2.5,
    gapScore: 9.7,
    difficulty: "Zor",
    timeToCreate: "4-6 hafta",
    reason: "AI Agent gelistirme 2026'nin en sicak konusu. ChatGPT, Claude API'leri ile entegre agent olusturma kurslari talep patlamasi yasiyor. Mevcut kaliteli kurslar cok az.",
  },
  {
    name: "AWS Solutions Architect Associate - Complete Prep 2026",
    category: "IT & Sertifika",
    estimatedPrice: 109.99,
    estimatedMonthlySales: 5000,
    estimatedMonthlyEnroll: 5000,
    estimatedMonthlyRevenue: 549950,
    demandScore: 9.4,
    supplyScore: 3.8,
    gapScore: 9.2,
    difficulty: "Orta",
    timeToCreate: "3-4 hafta",
    reason: "AWS sertifika sinavlari her gecen yil talep artiyor. En yeni 2026 sinav formatina uygun, hands-on labs iceren kurslara buyuk ihtiyac var.",
  },
  {
    name: "Full-Stack Next.js & AI Integration Bootcamp",
    category: "Yazilim Gelistirme",
    estimatedPrice: 89.99,
    estimatedMonthlySales: 6000,
    estimatedMonthlyEnroll: 6000,
    estimatedMonthlyRevenue: 539940,
    demandScore: 9.5,
    supplyScore: 5.2,
    gapScore: 8.8,
    difficulty: "Zor",
    timeToCreate: "6-8 hafta",
    reason: "Next.js + AI entegrasyonu (OpenAI, Vercel AI SDK) web gelistirmenin yeni standardi. Python + JavaScript bilmeyen developer'lar icin tam stack yol haritasi.",
  },
  {
    name: "No-Code AI App Builder: Bubble + AI Tools",
    category: "Yazilim Gelistirme",
    estimatedPrice: 79.99,
    estimatedMonthlySales: 10000,
    estimatedMonthlyEnroll: 10000,
    estimatedMonthlyRevenue: 799900,
    demandScore: 9.3,
    supplyScore: 2.8,
    gapScore: 9.5,
    difficulty: "Kolay",
    timeToCreate: "2-3 hafta",
    reason: "No-code + AI kombinasyonu yazilim bilmeden uygulama gelistirmek isteyen non-technical kullanicilar icin patlama yasiyor. Bubble, Cursor AI ile birlikte kullanimi.",
  },
  {
    name: "AI-Powered Digital Marketing Complete Course 2026",
    category: "Pazarlama & Sosyal Medya",
    estimatedPrice: 74.99,
    estimatedMonthlySales: 7000,
    estimatedMonthlyEnroll: 7000,
    estimatedMonthlyRevenue: 524930,
    demandScore: 8.8,
    supplyScore: 3.5,
    gapScore: 8.9,
    difficulty: "Orta",
    timeToCreate: "3-4 hafta",
    reason: "Geleneksel dijital pazarlama kurslari supersaturated. AI destekli pazarlama (ChatGPT copywriting, AI ad targeting, Jasper AI) ile farklilasma firsati.",
  },
  {
    name: "Data Engineering with Python: ETL, Pipelines & Airflow",
    category: "Veri Bilimi & AI/ML",
    estimatedPrice: 94.99,
    estimatedMonthlySales: 4000,
    estimatedMonthlyEnroll: 4000,
    estimatedMonthlyRevenue: 379960,
    demandScore: 9.1,
    supplyScore: 3.2,
    gapScore: 8.7,
    difficulty: "Zor",
    timeToCreate: "5-7 hafta",
    reason: "Veri mühendisligi kurslari data science'a kiyasla cok daha az sayida ama talebi hizla artiyor. Python ETL pipeline ve Apache Airflow ile practice-oriented kurslar eksik.",
  },
]

export const UDEMY_DATA_SOURCES = [
  { name: "Udemy Business Report 2025", desc: "Platform trend ve enrollment verileri", url: "https://business.udemy.com" },
  { name: "ClassCentral 2025", desc: "Online kurs pazar raporu", url: "https://www.classcentral.com/report" },
  { name: "eLearning Industry 2025", desc: "e-Learning pazar buyume analizi", url: "https://elearningindustry.com" },
  { name: "Global Knowledge IT Skills 2025", desc: "IT sertifika talep verileri", url: "https://www.globalknowledge.com" },
  { name: "Udemy Marketplace", desc: "Gercek kurs listeleri ve fiyatlar", url: "https://www.udemy.com" },
]

export function getUdemyCategorySlug(productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('python') || lower.includes('node.js') || lower.includes('react') || lower.includes('next.js')) return 'software-development'
  if (lower.includes('machine learning') || lower.includes('ai') || lower.includes('data engineering') || lower.includes('langchain') || lower.includes('crewai')) return 'data-science-ai'
  if (lower.includes('aws') || lower.includes('cloud') || lower.includes('sertifika')) return 'it-certifications'
  if (lower.includes('marketing') || lower.includes('seo') || lower.includes('social')) return 'marketing-social'
  if (lower.includes('figma') || lower.includes('ui') || lower.includes('ux') || lower.includes('tasarim')) return 'design-graphic'
  if (lower.includes('excel') || lower.includes('vba')) return 'finance-accounting'
  if (lower.includes('bubble') || lower.includes('nocode')) return 'software-development'
  return 'software-development'
}
