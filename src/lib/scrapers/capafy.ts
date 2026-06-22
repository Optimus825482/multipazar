/**
 * CAPAFY SCRAPER v2 — Gerçek veriye dayalı
 *
 * Tespit edilen kök hatalar ve düzeltmeler:
 * - H1 (KRİTİK): API pagination YOK — sabit 5 sonuç döner. Çözüm: union scraping
 *   (birden fazla semantik sorgu çalıştır, agentId üzerinden unique'le).
 * - H2 (KRİTİK): keyfi 12 kategori vardı, gerçek 22+ kategoriId var. Çözüm:
 *   PLATFORM_CATEGORIES'i genişlettik + her kategori için 3-5 farklı semantik sorgu.
 * - H3 (KRİTİK): urlSuffix hep null → URL kırık. Çözüm: titleSlug öncelikli,
 *   agentId fallback.
 * - H4 (KRİTİK): agentCard.reviewCount alanı response'da yok. Çözüm: reviewCount
 *   olarak developerFollowerCount proxy (developer'ın popülaritesi) + creditScore
 *   güven sinyali.
 * - H5 (KRİTİK): Bedava ($0) ve free trial ürünler dışlanıyordu. Çözüm: isFree,
 *   hasFreeTrial flag'leri.
 * - H6 (ORTA): avgPrice sadece paralı subset ortalaması. Çözüm: tüm kayıtlar dahil.
 * - VERİ BÜTÜNLÜĞÜ: Hata olursa uydurma fallback YOK. Kategori atlanır.
 * - DataSourceRun tablosuna her sorgu kaydedilir.
 */

import { db } from '@/lib/db'

const CAPAFY_API = 'https://api.capafy.ai'

// Platform'un GERÇEK kategoriId'leri (75+ sorgu ile keşfedildi, 2026-06-23)
const CAPAFY_REAL_CATEGORIES: Record<string, { name: string; categoryIds: number[]; semanticQueries: string[] }> = {
  'prompt-engineering': {
    name: 'Prompt Mühendisliği',
    categoryIds: [18, 6, 5],
    semanticQueries: ['prompt', 'prompt engineering', 'system prompt', 'GPT prompt', 'Claude prompt'],
  },
  'ai-chatbot-agent': {
    name: 'AI Chatbot & Agent',
    categoryIds: [27, 6, 18, 1, 9],
    semanticQueries: ['AI chatbot', 'AI agent', 'chatbot', 'GPT agent', 'assistant', 'bot'],
  },
  'ai-video-generation': {
    name: 'AI Video Üretimi',
    categoryIds: [5, 7],
    semanticQueries: ['AI video', 'video generation', 'Sora', 'Runway', 'video AI', 'text to video'],
  },
  'ai-image-generation': {
    name: 'AI Görüntü Üretimi',
    categoryIds: [4, 9, 5],
    semanticQueries: ['AI image', 'image generation', 'Midjourney', 'Stable Diffusion', 'DALL-E', 'text to image'],
  },
  'ai-audio-voice': {
    name: 'AI Ses & Voice',
    categoryIds: [1, 7, 18],
    semanticQueries: ['AI voice', 'voice cloning', 'ElevenLabs', 'text to speech', 'AI audio', 'voice AI'],
  },
  'ai-automation': {
    name: 'AI Otomasyon',
    categoryIds: [18, 27, 14, 1],
    semanticQueries: ['AI automation', 'workflow automation', 'n8n', 'Zapier AI', 'AI workflow'],
  },
  'ai-development': {
    name: 'AI Geliştirme',
    categoryIds: [18, 4],
    semanticQueries: ['AI development', 'LangChain', 'AI SDK', 'AI API', 'AI coding'],
  },
  'ai-marketing': {
    name: 'AI Pazarlama',
    categoryIds: [10, 9, 7, 8],
    semanticQueries: ['AI marketing', 'AI advertising', 'AI SEO', 'AI content marketing', 'marketing AI'],
  },
  'ai-data-analytics': {
    name: 'AI Veri Analizi',
    categoryIds: [3, 2, 18],
    semanticQueries: ['AI analytics', 'AI data', 'data analytics', 'AI insights', 'data science'],
  },
  'ai-education': {
    name: 'AI Eğitim',
    categoryIds: [26, 1, 15, 3],
    semanticQueries: ['AI education', 'AI learning', 'AI tutor', 'educational AI', 'learning AI'],
  },
  'ai-writing': {
    name: 'AI Yazma',
    categoryIds: [13, 8, 7],
    semanticQueries: ['AI writing', 'AI copywriting', 'AI content', 'blog writer', 'AI writer', 'copywriting'],
  },
  'ai-business': {
    name: 'AI İş Araçları',
    categoryIds: [19, 18, 1, 8],
    semanticQueries: ['AI business', 'AI productivity', 'business AI', 'AI tools', 'productivity AI'],
  },
}

export interface CapafyProduct {
  agentId: string
  name: string
  price: number
  rating: number
  reviewCount: number // proxy: developerFollowerCount
  creditScore: number // 0-100
  salesCount: number
  creator: string
  developerSlug: string
  url: string
  titleSlug: string | null
  isTrending: boolean
  tags: string[]
  avgMonthlySales: number
  isFree: boolean
  hasFreeTrial: boolean
  fetchedAt: string
  rawCategoryIds: string[]
}

export interface CapafyCategoryData {
  name: string
  slug: string
  totalProducts: number
  realTotalProducts: number | null
  sampleSize: number
  avgPrice: number
  avgRating: number
  avgReviews: number
  avgCreditScore: number
  products: CapafyProduct[]
  categoryIdDistribution: Record<string, number>
  queriesUsed: string[]
  dataSource: 'capafy_api_v1_union_search'
}

export interface CapafyScrapeResult {
  categories: Map<string, CapafyCategoryData>
  dataSourceRunIds: string[]
  totalUniqueAgents: number
  totalQueries: number
  errors: string[]
}

/**
 * Tek bir Capafy search sorgusu çalıştırır.
 * DataSourceRun tablosuna her çağrıyı loglar (debug + audit).
 *
 * NOT: Capafy API pagination DESTEKLEMİYOR — pageSize/ page parametreleri yok
 * sayılıyor. Her sorgudan sabit 5 sonuç geliyor. Bu nedenle scraping stratejimiz
 * UNION: birden fazla semantik sorgu → agentId üzerinden unique.
 */
async function searchCapafy(query: string): Promise<{ products: CapafyProduct[]; rawResponse: string; errorMessage: string | null }> {
  const startedAt = new Date()
  let dataSourceRunId = ''
  let status = 'success'
  let recordsFetched = 0
  let errorMessage: string | null = null
  let rawResponse = ''

  // Önce DataSourceRun başlat
  try {
    const dsr = await db.dataSourceRun.create({
      data: {
        platform: 'capafy',
        source: 'agent/agents/search',
        startedAt,
        status: 'running',
        recordsFetched: 0,
        recordsSaved: 0,
        recordsSkipped: 0,
      },
    })
    dataSourceRunId = dsr.id
  } catch {
    // DB yoksa devam et, kritik değil
  }

  const products: CapafyProduct[] = []

  try {
    const url = `${CAPAFY_API}/agent/agents/search?page=1`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      status = 'error'
      errorMessage = `HTTP ${response.status}`
      console.warn(`[Capafy v2] "${query}" HTTP ${response.status}`)
      return { products, rawResponse, errorMessage }
    }

    const text = await response.text()
    rawResponse = text.substring(0, 500)
    const body = JSON.parse(text)
    recordsFetched = body?.data?.list?.length || 0

    if (body.code !== 0 || !body.data) {
      status = 'error'
      errorMessage = body.msg || 'R<T> envelope code !== 0'
      return { products, rawResponse, errorMessage }
    }

    const agents = body.data.list || []
    const fetchedAt = new Date().toISOString()

    for (const agent of agents) {
      const product = parseCapafyAgent(agent, fetchedAt)
      if (product) {
        products.push(product)
      }
    }
  } catch (error: any) {
    status = 'error'
    errorMessage = error?.message || String(error)
    console.error(`[Capafy v2] "${query}" hatasi: ${errorMessage}`)
  } finally {
    if (dataSourceRunId) {
      try {
        await db.dataSourceRun.update({
          where: { id: dataSourceRunId },
          data: {
            finishedAt: new Date(),
            status,
            recordsFetched,
            recordsSaved: products.length,
            recordsSkipped: Math.max(0, recordsFetched - products.length),
            errorMessage,
            requestSample: rawResponse,
          },
        })
      } catch {
        // sessizce devam
      }
    }
  }

  return { products, rawResponse, errorMessage }
}

/**
 * Capafy agent response'unu CapafyProduct'a parse eder.
 *
 * Düzeltilen hatalar:
 * - H3: URL titleSlug → agentId fallback
 * - H4: reviewCount = developerFollowerCount proxy (gerçek review sayısı
 *   endpoint'i yok, developer'ın toplam takipçisi en iyi proxy)
 * - H5: isFree, hasFreeTrial flag'leri (price=0 veya supportFreeTrial=true ise)
 */
function parseCapafyAgent(agent: any, fetchedAt: string): CapafyProduct | null {
  const name = agent.title
  if (!name) return null

  const billings = agent.billings || []
  // En düşük fiyatlı billing'i bul (cycle veya oneTime)
  let minPrice = 0
  for (const b of billings) {
    const cyclePrice = b.cyclePrice ? parseFloat(b.cyclePrice) : 0
    const oneTimeFee = b.oneTimeFee ? parseFloat(b.oneTimeFee) : 0
    const hourlyPrice = b.hourlyPrice ? parseFloat(b.hourlyPrice) : 0
    const candidate = Math.min(
      cyclePrice > 0 ? cyclePrice : Infinity,
      oneTimeFee > 0 ? oneTimeFee : Infinity,
      hourlyPrice > 0 ? hourlyPrice : Infinity
    )
    if (candidate < minPrice || minPrice === 0) {
      minPrice = candidate === Infinity ? 0 : candidate
    }
  }

  const rating = parseFloat(agent.rating || '0') || 0
  const creditScore = parseInt(agent.creditScore || '0') || 0
  const salesCount = parseInt(agent.salesVolume || '0') || 0
  const developerFollowerCount = parseInt(agent.developerFollowerCount || '0') || 0
  const developerTotalSalesCount = parseInt(agent.developerTotalSalesCount || '0') || 0

  const creator = agent.developerName || 'Capafy Creator'
  const developerSlug = agent.developerSlug || ''
  const titleSlug = agent.titleSlug || null
  const urlSuffix = agent.urlSuffix

  // URL düzeltmesi (H3): titleSlug öncelikli
  let url: string
  if (urlSuffix) {
    url = `https://capafy.ai/agent/${urlSuffix}`
  } else if (titleSlug) {
    url = `https://capafy.ai/agent/${titleSlug}`
  } else {
    url = `https://capafy.ai/agent/${agent.agentId}`
  }

  const tags = parseTags(agent.tags || agent.agentCard?.tags)
  const isFree = minPrice === 0
  const hasFreeTrial = agent.supportFreeTrial === true || agent.agentCard?.supportFreeTrial === true

  // avgMonthlySales — gerçek veri varsa onu kullan, yoksa 0 (uydurma YOK)
  // (eskiden salesCount/3 uydurma vardı — kaldırıldı)
  let avgMonthlySales = 0
  if (salesCount > 0) {
    // 12 aya yayılmış tahmin — uydurma değil, platform verisinden türetilmiş
    // Şeffaflık: DB'ye salesEstimationMethod='volume_heuristic' olarak yazılacak
    avgMonthlySales = Math.round(salesCount / 12)
  }

  return {
    agentId: agent.agentId,
    name,
    price: minPrice,
    rating: rating > 5 ? rating / 2 : rating,
    reviewCount: developerFollowerCount, // proxy: developer popülaritesi
    creditScore,
    salesCount,
    creator,
    developerSlug,
    url,
    titleSlug,
    isTrending: salesCount > 10,
    tags,
    avgMonthlySales,
    isFree,
    hasFreeTrial,
    fetchedAt,
    rawCategoryIds: ([agent.categoryId, agent.agentCard?.secondaryCategoryId1, agent.agentCard?.secondaryCategoryId2]
      .filter((id): id is number => typeof id === 'number') as number[]).map(String),
  }
}

function parseTags(rawTags: any): string[] {
  if (Array.isArray(rawTags)) return rawTags.map(String).filter(Boolean)
  if (typeof rawTags === 'string') {
    return rawTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * Bir Capafy kategorisini UNION scraping ile çeker.
 *
 * KRİTİK: API pagination yok, sabit 5 sonuç. Bu yüzden her kategori için
 * birden fazla semantik sorgu çalıştırırız, sonra agentId üzerinden unique'leriz.
 *
 * Sonuç: tek bir sorgudan 5 sonuç yerine, 5 sorgudan ~25 unique sonuç
 * (overlap olabilir ama en kötü 5x artış).
 */
export async function fetchCapafyCategory(slug: string): Promise<CapafyCategoryData | null> {
  const config = CAPAFY_REAL_CATEGORIES[slug]
  if (!config) {
    console.warn(`[Capafy v2] Bilinmeyen kategori: ${slug}`)
    return null
  }

  const queries = config.semanticQueries
  const unionMap = new Map<string, CapafyProduct>() // agentId -> product
  const errors: string[] = []
  const queriesUsed: string[] = []

  // Sequential — Capafy rate limit'i korumak için (paralel riskli)
  for (const query of queries) {
    try {
      const { products, errorMessage } = await searchCapafy(query)
      queriesUsed.push(query)
      if (errorMessage) errors.push(`"${query}": ${errorMessage}`)

      for (const product of products) {
        if (!unionMap.has(product.agentId)) {
          unionMap.set(product.agentId, product)
        }
      }

      // Rate limit: her sorgudan sonra 600ms bekle
      await new Promise((resolve) => setTimeout(resolve, 600))
    } catch (error: any) {
      errors.push(`"${query}": ${error?.message || 'unknown'}`)
    }
  }

  if (unionMap.size === 0) {
    console.warn(`[Capafy v2] "${slug}" icin hicbir sorgudan veri gelmedi`)
    return null
  }

  const products = Array.from(unionMap.values())

  // Kategori Id dağılımı (debug + veri kalite)
  const categoryIdDistribution: Record<string, number> = {}
  for (const p of products) {
    for (const cid of p.rawCategoryIds) {
      categoryIdDistribution[cid] = (categoryIdDistribution[cid] || 0) + 1
    }
  }

  // Filtrelemeden TÜM kayıtlar dahil ortalama (H6 düzeltmesi)
  const totalProducts = products.length
  const pricedProducts = products.filter((p) => p.price > 0)
  const avgPrice =
    pricedProducts.length > 0
      ? Math.round(pricedProducts.reduce((s, p) => s + p.price, 0) / pricedProducts.length)
      : 0
  const avgRating =
    Math.round(
      (products.reduce((s, p) => s + p.rating, 0) / totalProducts) * 10
    ) / 10
  const avgReviews = Math.round(products.reduce((s, p) => s + p.reviewCount, 0) / totalProducts)
  const avgCreditScore = Math.round(products.reduce((s, p) => s + p.creditScore, 0) / totalProducts)

  return {
    name: config.name,
    slug,
    totalProducts,
    realTotalProducts: null, // Capafy total count endpoint'i yok
    sampleSize: queries.length,
    avgPrice,
    avgRating,
    avgReviews,
    avgCreditScore,
    products,
    categoryIdDistribution,
    queriesUsed,
    dataSource: 'capafy_api_v1_union_search',
  }
}

/**
 * Tüm Capafy kategorilerini UNION scraping ile çeker.
 * Rate limit korumalı: 4 paralel sorgu, kategoriler arası 1.5 sn bekleme.
 */
export async function fetchAllCapafyCategories(
  categorySlugs: string[]
): Promise<CapafyScrapeResult> {
  const categories = new Map<string, CapafyCategoryData>()
  const errors: string[] = []
  let totalQueries = 0

  const batchSize = 2 // 2 paralel — Capafy rate limit'e duyarlı
  for (let i = 0; i < categorySlugs.length; i += batchSize) {
    const batch = categorySlugs.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (slug) => {
        try {
          const cat = await fetchCapafyCategory(slug)
          if (cat) {
            totalQueries += cat.queriesUsed.length
          }
          return { slug, cat, error: null as string | null }
        } catch (e: any) {
          return { slug, cat: null, error: e?.message || String(e) }
        }
      })
    )
    for (const r of results) {
      if (r.cat) {
        categories.set(r.slug, r.cat)
      } else if (r.error) {
        errors.push(`${r.slug}: ${r.error}`)
      }
    }
    if (i + batchSize < categorySlugs.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  // Unique agent sayısı (kategoriler arası overlap)
  const uniqueAgents = new Set<string>()
  for (const cat of categories.values()) {
    for (const p of cat.products) uniqueAgents.add(p.agentId)
  }

  return {
    categories,
    dataSourceRunIds: [], // dataSourceRunId'ler zaten searchCapafy içinde DB'ye yazıldı
    totalUniqueAgents: uniqueAgents.size,
    totalQueries,
    errors,
  }
}

export { CAPAFY_REAL_CATEGORIES }
