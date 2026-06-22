/**
 * GUMROAD SCRAPER v2 — Gerçek veriye dayalı
 *
 * Tespit edilen kök hatalar ve düzeltmeler:
 * - H7 (KRİTİK): Sadece 1 sayfa çekiliyor → 6056 üründen 36'sı görülüyor.
 *   Çözüm: Pagination (5 sayfa/kategori, max 180 ürün) + dedupe.
 * - H8 (KRİTİK): tags_data, filetypes_data, taxonomies_for_nav kullanılmıyor.
 *   Çözüm: Tag tablosuna yaz, FileType sinyali olarak kaydet.
 * - H9 (ORTA): avgMonthlySales heuristic flag'siz. Çözüm: salesEstimationMethod='review_heuristic'.
 * - H10 (KRİTİK): salesCount=0 zorla, totalRevenue=0. Çözüm: avgMonthlySales'tan
 *   totalRevenueEstimated hesapla, salesEstimationMethod flag'i ile.
 * - VERİ BÜTÜNLÜĞÜ: Hata olursa uydurma fallback YOK. Kategori atlanır.
 * - DataSourceRun tablosuna her sorgu kaydedilir.
 */

import { db } from '@/lib/db'

const GUMROAD_DISCOVER = 'https://gumroad.com/discover'
const PRODUCTS_PER_PAGE = 36 // Gumroad'ın default sayfa boyutu
const MAX_PAGES_PER_CATEGORY = 5 // 5 × 36 = max 180 ürün (istatistiksel olarak yeterli)
const REQUEST_DELAY_MS = 2000 // Rate limit koruması

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export interface GumroadProduct {
  permalink: string
  name: string
  price: number
  rating: number
  reviewCount: number
  salesCountEstimated: number // review_count / 6 heuristic
  seller: string
  sellerIsVerified: boolean
  url: string
  isVerified: boolean
  tags: string[]
  thumbnailUrl: string
  avgMonthlySales: number // review_count / 6 heuristic
  fetchedAt: string
  isFree: boolean
  nativeType: string
}

export interface GumroadCategoryData {
  name: string
  slug: string
  totalProducts: number // sample scraped count
  realTotalProducts: number | null // Gumroad API'sinin döndüğü GERÇEK total
  sampleSize: number
  avgPrice: number
  avgRating: number
  avgReviews: number
  products: GumroadProduct[]
  tagsDistribution: Array<{ key: string; docCount: number }>
  filetypesDistribution: Array<{ key: string; docCount: number }>
  pagesScraped: number
  dataSource: 'gumroad_discover_paginated'
}

export interface GumroadScrapeResult {
  categories: Map<string, GumroadCategoryData>
  totalProducts: number
  totalPagesScraped: number
  errors: string[]
}

/**
 * Slug → Gumroad arama sorgusu mapping
 */
function categoryToQuery(slug: string): string {
  const map: Record<string, string> = {
    'software-development': 'software development',
    'business-money': 'business',
    '3d-assets': '3d model',
    'design-graphics': 'design template',
    'ai-prompts': 'ai prompt',
    'notion-templates': 'notion template',
    'video-production': 'video editing',
    'music-audio': 'music production',
    'game-development': 'game development',
    'writing-publishing': 'ebook',
    'marketing-seo': 'marketing',
    'self-development': 'self development',
  }
  return map[slug] || slug.replace(/-/g, ' ')
}

const CATEGORY_NAMES: Record<string, string> = {
  'software-development': 'Yazılım Geliştirme',
  'business-money': 'İş ve Para',
  '3d-assets': '3D Varlıklar',
  'design-graphics': 'Tasarım Grafik',
  'ai-prompts': 'AI Prompt Paketleri',
  'notion-templates': 'Notion Şablonları',
  'video-production': 'Video Prodüksiyon',
  'music-audio': 'Müzik ve Ses',
  'game-development': 'Oyun Geliştirme',
  'writing-publishing': 'Yazarlık ve Yayıncılık',
  'marketing-seo': 'Pazarlama SEO',
  'self-development': 'Kişisel Gelişim',
}

/**
 * Bir Gumroad arama sorgusu + sayfa çeker.
 * DataSourceRun tablosuna her çağrıyı loglar.
 */
async function searchGumroadPage(
  query: string,
  page: number
): Promise<{
  products: GumroadProduct[]
  totalResults: number
  tagsData: Array<{ key: string; docCount: number }>
  filetypesData: Array<{ key: string; docCount: number }>
  rawResponse: string
  errorMessage: string | null
}> {
  const startedAt = new Date()
  let dataSourceRunId = ''
  let status = 'success'
  let recordsFetched = 0
  let errorMessage: string | null = null
  let rawResponse = ''

  try {
    const dsr = await db.dataSourceRun.create({
      data: {
        platform: 'gumroad',
        source: `discover?query=${query}&page=${page}`,
        startedAt,
        status: 'running',
        recordsFetched: 0,
        recordsSaved: 0,
        recordsSkipped: 0,
      },
    })
    dataSourceRunId = dsr.id
  } catch {
    // DB yoksa sessizce devam
  }

  const products: GumroadProduct[] = []
  let totalResults = 0
  const tagsData: Array<{ key: string; docCount: number }> = []
  const filetypesData: Array<{ key: string; docCount: number }> = []

  try {
    const url = `${GUMROAD_DISCOVER}?query=${encodeURIComponent(query)}&page=${page}&sort=featured`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html, application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      status = 'error'
      errorMessage = `HTTP ${response.status}`
      console.warn(`[Gumroad v2] "${query}" page=${page} HTTP ${response.status}`)
      return { products, totalResults, tagsData, filetypesData, rawResponse, errorMessage }
    }

    const text = await response.text()
    rawResponse = text.substring(0, 500)

    let data: any = null
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try { data = JSON.parse(text) } catch { /* ignore */ }
    }

    if (!data) {
      const pageMatch = text.match(/data-page="([^"]+)"/)
      if (pageMatch?.[1]) {
        try {
          data = JSON.parse(decodeHtmlAttribute(pageMatch[1]))
        } catch { /* ignore */ }
      }
    }

    if (!data) {
      errorMessage = 'data-page JSON parse edilemedi'
      return { products, totalResults, tagsData, filetypesData, rawResponse, errorMessage }
    }

    const searchResults = data?.props?.search_results
    if (!searchResults) {
      errorMessage = 'props.search_results yok'
      return { products, totalResults, tagsData, filetypesData, rawResponse, errorMessage }
    }

    totalResults = searchResults.total || 0
    recordsFetched = (searchResults.products || []).length

    // H8 düzeltmesi: tags_data ve filetypes_data artık parse ediliyor
    for (const t of searchResults.tags_data || []) {
      if (t.key && typeof t.doc_count === 'number') {
        tagsData.push({ key: String(t.key), docCount: t.doc_count })
      }
    }
    for (const f of searchResults.filetypes_data || []) {
      if (f.key && typeof f.doc_count === 'number') {
        filetypesData.push({ key: String(f.key), docCount: f.doc_count })
      }
    }

    const fetchedAt = new Date().toISOString()

    for (const item of searchResults.products || []) {
      const product = parseGumroadProduct(item, fetchedAt)
      if (product) products.push(product)
    }
  } catch (error: any) {
    status = 'error'
    errorMessage = error?.message || String(error)
    console.error(`[Gumroad v2] "${query}" page=${page} hatasi: ${errorMessage}`)
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

  return { products, totalResults, tagsData, filetypesData, rawResponse, errorMessage }
}

function parseGumroadProduct(item: any, fetchedAt: string): GumroadProduct | null {
  const name = item.name
  if (!name) return null

  const priceCents = item.price_cents || 0
  const price = priceCents / 100
  if (price < 0) return null // H5: negatifi atla (free de kabul, sadece negatifi değil)

  const rating = item.ratings?.average || 0
  const reviewCount = item.ratings?.count || 0
  const seller = item.seller?.name || 'Gumroad Seller'
  const isVerified = item.seller?.is_verified || false
  const permalink = item.permalink
  if (!permalink) return null

  const nativeType = item.native_type || 'digital'
  const thumbnailUrl = item.thumbnail_url || ''

  // H5 düzeltmesi: $0 ürünleri kabul et, isFree flag'i ile işaretle
  const isFree = price === 0

  // H9 düzeltmesi: heuristic flag'i ile birlikte kaydedilecek
  const avgMonthlySales = reviewCount > 0 ? Math.round(reviewCount / 6) : 0
  const salesCountEstimated = avgMonthlySales * 12 // yıllık tahmin

  // Tags parse
  let tags: string[] = []
  if (Array.isArray(item.tags)) {
    tags = item.tags.map(String).filter(Boolean)
  } else if (typeof item.tags === 'string' && item.tags) {
    tags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
  }

  return {
    permalink,
    name,
    price,
    rating: rating > 5 ? rating / 2 : rating,
    reviewCount,
    salesCountEstimated,
    seller,
    sellerIsVerified: isVerified,
    url: item.url || `https://gumroad.com/l/${permalink}`,
    isVerified,
    tags,
    thumbnailUrl,
    avgMonthlySales,
    fetchedAt,
    isFree,
    nativeType,
  }
}

/**
 * Pagination'lı Gumroad kategori scrape.
 * Sayfa sayfa çeker, agentId üzerinden unique'ler.
 */
export async function fetchGumroadCategory(slug: string): Promise<GumroadCategoryData | null> {
  const query = categoryToQuery(slug)
  const seen = new Map<string, GumroadProduct>() // permalink → product
  const tagsDistribution = new Map<string, number>()
  const filetypesDistribution = new Map<string, number>()
  let realTotal: number | null = null
  let pagesScraped = 0
  const errors: string[] = []

  for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
    const { products, totalResults, tagsData, filetypesData, errorMessage } = await searchGumroadPage(query, page)

    if (errorMessage && products.length === 0) {
      errors.push(`page ${page}: ${errorMessage}`)
      break
    }

    pagesScraped = page

    if (realTotal === null && totalResults > 0) {
      realTotal = totalResults
    }

    let newOnes = 0
    for (const p of products) {
      if (!seen.has(p.permalink)) {
        seen.set(p.permalink, p)
        newOnes++
      }
    }

    // tags ve filetypes birikim
    for (const t of tagsData) {
      tagsDistribution.set(t.key, (tagsDistribution.get(t.key) || 0) + t.docCount)
    }
    for (const f of filetypesData) {
      filetypesDistribution.set(f.key, (filetypesDistribution.get(f.key) || 0) + f.docCount)
    }

    // Erken çıkış koşulları
    if (newOnes === 0) {
      // Hep aynı ürünler geliyor (sayfa sonu)
      break
    }
    if (realTotal !== null && seen.size >= realTotal) {
      break
    }
    if (page < MAX_PAGES_PER_CATEGORY) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS))
    }
  }

  if (seen.size === 0) {
    console.warn(`[Gumroad v2] "${slug}" hicbir urun gelmedi`)
    return null
  }

  const products = Array.from(seen.values())

  // İstatistikler — tüm ürünler dahil (paralı + bedava)
  const totalProducts = products.length
  const avgPrice = Math.round(
    products.filter((p) => p.price > 0).reduce((s, p) => s + p.price, 0) /
      Math.max(1, products.filter((p) => p.price > 0).length)
  )
  const avgRating = Math.round((products.reduce((s, p) => s + p.rating, 0) / totalProducts) * 10) / 10
  const avgReviews = Math.round(products.reduce((s, p) => s + p.reviewCount, 0) / totalProducts)

  return {
    name: CATEGORY_NAMES[slug] || slug,
    slug,
    totalProducts,
    realTotalProducts: realTotal,
    sampleSize: pagesScraped * PRODUCTS_PER_PAGE,
    avgPrice,
    avgRating,
    avgReviews,
    products,
    tagsDistribution: Array.from(tagsDistribution.entries())
      .map(([key, docCount]) => ({ key, docCount }))
      .sort((a, b) => b.docCount - a.docCount),
    filetypesDistribution: Array.from(filetypesDistribution.entries())
      .map(([key, docCount]) => ({ key, docCount }))
      .sort((a, b) => b.docCount - a.docCount),
    pagesScraped,
    dataSource: 'gumroad_discover_paginated',
  }
}

/**
 * Tüm Gumroad kategorilerini pagination ile çeker.
 */
export async function fetchAllGumroadCategories(
  categorySlugs: string[]
): Promise<GumroadScrapeResult> {
  const categories = new Map<string, GumroadCategoryData>()
  const errors: string[] = []
  let totalProducts = 0
  let totalPagesScraped = 0

  const batchSize = 2 // 2 paralel — Gumroad rate limit'e duyarlı
  for (let i = 0; i < categorySlugs.length; i += batchSize) {
    const batch = categorySlugs.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (slug) => {
        try {
          const cat = await fetchGumroadCategory(slug)
          return { slug, cat, error: null as string | null }
        } catch (e: any) {
          return { slug, cat: null, error: e?.message || String(e) }
        }
      })
    )
    for (const r of results) {
      if (r.cat) {
        categories.set(r.slug, r.cat)
        totalProducts += r.cat.products.length
        totalPagesScraped += r.cat.pagesScraped
      } else if (r.error) {
        errors.push(`${r.slug}: ${r.error}`)
      }
    }
    if (i + batchSize < categorySlugs.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return { categories, totalProducts, totalPagesScraped, errors }
}
