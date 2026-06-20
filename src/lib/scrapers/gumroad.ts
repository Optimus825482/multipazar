export interface GumroadProduct {
  name: string
  price: number
  rating: number
  reviewCount: number
  salesCount: number
  seller: string
  url: string
  isVerified: boolean
  tags: string
  thumbnailUrl: string
  avgMonthlySales: number
  demandScore: number
  supplyScore: number
}

export interface GumroadCategoryData {
  name: string
  slug: string
  totalProducts: number
  avgPrice: number
  avgRating: number
  avgReviews: number
  products: GumroadProduct[]
}

const GUMROAD_DISCOVER = 'https://gumroad.com/discover'

/**
 * Gumroad Inertia.js JSON API'inden urun verilerini ceker
 * X-Inertia header'i ile direkt JSON doner (Puppeteer gerekmez)
 */
async function searchGumroad(query: string, page: number = 1): Promise<{
  products: GumroadProduct[]
  totalResults: number
  tagsData: { key: string; docCount: number }[]
}> {
  const products: GumroadProduct[] = []
  let totalResults = 0
  let tagsData: { key: string; docCount: number }[] = []

  try {
    const url = `${GUMROAD_DISCOVER}?query=${encodeURIComponent(query)}&page=${page}&sort=featured`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'X-Inertia': 'true',
        'X-Inertia-Version': '1',
        'Accept': 'text/html, application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      console.warn(`[Gumroad] "${query}" HTTP ${response.status}`)
      return { products, totalResults, tagsData }
    }

    const data = await response.json()

    // Gumroad Inertia response: { component, props: { search_results: { products, total, tags_data } } }
    const searchResults = data?.props?.search_results
    if (!searchResults) {
      console.warn(`[Gumroad] "${query}" search_results bulunamadi`)
      return { products, totalResults, tagsData }
    }

    totalResults = searchResults.total || 0
    tagsData = (searchResults.tags_data || []).map((t: any) => ({
      key: t.key,
      docCount: t.doc_count || 0,
    }))

    const items = searchResults.products || []

    for (const item of items) {
      const name = item.name || ''
      const priceCents = item.price_cents || 0
      const price = priceCents / 100 // cents to dollars
      const rating = item.ratings?.average || 0
      const reviewCount = item.ratings?.count || 0
      const seller = item.seller?.name || 'Gumroad Seller'
      const isVerified = item.seller?.is_verified || false
      const permalink = item.permalink || ''
      const nativeType = item.native_type || 'digital'
      const thumbnailUrl = item.thumbnail_url || ''
      const tags = item.tags?.join(',') || query

      if (name && price > 0) {
        products.push({
          name,
          price,
          rating: rating > 5 ? rating / 2 : rating,
          reviewCount,
          salesCount: 0, // Gumroad sales count hidden for most products
          seller,
          url: `https://gumroad.com/l/${permalink}`,
          isVerified,
          tags,
          thumbnailUrl,
          avgMonthlySales: reviewCount > 0 ? Math.round(reviewCount / 6) : 0,
          demandScore: 0,
          supplyScore: 0,
        })
      }
    }
  } catch (error: any) {
    console.error(`[Gumroad] "${query}" hatasi: ${error?.message || error}`)
  }

  return { products, totalResults, tagsData }
}

/**
 * Kategori slug -> Gumroad arama sorgusu
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

/**
 * Kategori adi mapping
 */
const CATEGORY_NAMES: Record<string, string> = {
  'software-development': 'Yazilim Gelistirme',
  'business-money': 'Is ve Para',
  '3d-assets': '3D Varliklar',
  'design-graphics': 'Tasarim Grafik',
  'ai-prompts': 'AI Prompt Paketleri',
  'notion-templates': 'Notion Sablonlari',
  'video-production': 'Video Prodüksiyon',
  'music-audio': 'Muzik ve Ses',
  'game-development': 'Oyun Gelistirme',
  'writing-publishing': 'Yazarlik ve Yayincilik',
  'marketing-seo': 'Pazarlama SEO',
  'self-development': 'Kisisel Gelisim',
}

/**
 * Bir Gumroad kategorisini ceker
 */
export async function fetchGumroadCategory(categorySlug: string): Promise<GumroadCategoryData | null> {
  const query = categoryToQuery(categorySlug)
  const { products, totalResults } = await searchGumroad(query, 1)

  if (products.length === 0) {
    return null
  }

  const totalProducts = totalResults > 0 ? Math.min(totalResults, 1000) : products.length
  const avgPrice = Math.round(products.reduce((s, p) => s + p.price, 0) / products.length)
  const avgRating = Math.round(products.reduce((s, p) => s + p.rating, 0) / products.length * 10) / 10
  const avgReviews = Math.round(products.reduce((s, p) => s + p.reviewCount, 0) / products.length)

  return {
    name: CATEGORY_NAMES[categorySlug] || categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    slug: categorySlug,
    totalProducts,
    avgPrice,
    avgRating,
    avgReviews,
    products,
  }
}

/**
 * Tum Gumroad kategorilerini ceker (paralel batch)
 */
export async function fetchAllGumroadCategories(
  categorySlugs: string[]
): Promise<Map<string, GumroadCategoryData>> {
  const results = new Map<string, GumroadCategoryData>()

  const batchSize = 4
  for (let i = 0; i < categorySlugs.length; i += batchSize) {
    const batch = categorySlugs.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((slug) => fetchGumroadCategory(slug))
    )
    for (let j = 0; j < batch.length; j++) {
      if (batchResults[j]) {
        results.set(batch[j], batchResults[j]!)
      }
    }
    if (i + batchSize < categorySlugs.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}
