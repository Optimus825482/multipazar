import cloudscraper from 'cloudscraper'
import * as cheerio from 'cheerio'

export interface CapafyProduct {
  name: string
  price: number
  rating: number
  reviewCount: number
  salesCount: number
  creator: string
  url: string
  isTrending: boolean
  tags: string
  avgMonthlySales: number
  demandScore: number
  supplyScore: number
}

export interface CapafyCategoryData {
  name: string
  slug: string
  totalProducts: number
  avgPrice: number
  avgRating: number
  avgReviews: number
  products: CapafyProduct[]
}

const PROMPTBASE_URL = 'https://promptbase.com'

/**
 * PromptBase.com'dan gercek AI prompt urunlerini ceker
 * Cloudflare: promptbase.com acik, cloudscraper gerekmez, basic axios calisir
 */
async function scrapePromptBase(): Promise<CapafyProduct[]> {
  const products: CapafyProduct[] = []

  try {
    const html = await cloudscraper.get({
      uri: PROMPTBASE_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(html)

    // Product listesi - promptbase.com'un HTML yapisina gore seciciler
    const productSelectors = [
      '[class*="product-card"]',
      '[class*="ProductCard"]',
      '[class*="marketplace-item"]',
      'article',
      '.card',
      '[class*="listing"]',
      'div[class*="item"]',
      'li[class*="product"]',
    ].join(', ')

    $(productSelectors).each((_, el) => {
      const name = $(el).find('[class*="title"], h2, h3, [class*="name"]').first().text().trim()
      const priceText = $(el).find('[class*="price"], [class*="amount"], [class*="cost"]').first().text().trim()
      const creatorText = $(el).find('[class*="author"], [class*="creator"], [class*="seller"]').first().text().trim()
      const ratingText = $(el).find('[class*="rating"], [class*="stars"]').first().text().trim()
      const salesText = $(el).find('[class*="sales"], [class*="sold"]').first().text().trim()
      const linkEl = $(el).find('a').first()
      const urlPath = linkEl.attr('href') || ''

      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0
      const rating = parseFloat(ratingText) || 0
      const salesCount = parseInt(salesText.replace(/[^0-9]/g, '')) || 0

      if (name && price > 0) {
        products.push({
          name,
          price,
          rating: rating > 5 ? rating / 10 : rating, // normalize 0-5
          reviewCount: 0,
          salesCount,
          creator: creatorText || 'PromptBase Seller',
          url: urlPath.startsWith('http') ? urlPath : `https://promptbase.com${urlPath}`,
          isTrending: false,
          tags: 'ai-prompts',
          avgMonthlySales: salesCount > 0 ? Math.round(salesCount / 3) : 0,
          demandScore: 0,
          supplyScore: 0,
        })
      }
    })

    // JSON-LD'den de dene
    if (products.length === 0) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}')
          const items = json['@graph'] || json['itemListElement'] || [json]
          for (const item of items) {
            const product = item['@type'] === 'Product' ? item : item?.item
            if (product?.['@type'] === 'Product' && product?.name) {
              products.push({
                name: product.name,
                price: parseFloat(product?.offers?.price || '0'),
                rating: parseFloat(product?.aggregateRating?.ratingValue || '0'),
                reviewCount: parseInt(product?.aggregateRating?.reviewCount || '0'),
                salesCount: 0,
                creator: product?.brand?.name || product?.author?.name || 'PromptBase',
                url: product?.url || '',
                isTrending: false,
                tags: 'ai-prompts',
                avgMonthlySales: 0,
                demandScore: 0,
                supplyScore: 0,
              })
            }
          }
        } catch {}
      })
    }
  } catch (error: any) {
    console.error(`[PromptBase Scraper] Hata: ${error?.message || error}`)
  }

  return products
}

/**
 * Fiverr'den AI prompt gig'lerini ceker (cloudscraper ile)
 */
async function scrapeFiverrAI(): Promise<CapafyProduct[]> {
  const products: CapafyProduct[] = []
  const searchTerms = ['ai-prompt', 'ai-agent', 'ai-chatbot', 'ai-automation', 'ai-video-generation']

  try {
    for (const term of searchTerms) {
      const html = await cloudscraper.get({
        uri: `https://www.fiverr.com/search/gigs?query=${term}&page=1`,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000,
      })

      const $ = cheerio.load(html)

      // Fiverr JSON data'yı <script> icinden bul
      $('script').each((_, el) => {
        const text = $(el).html() || ''
        // Fiverr initial state JSON'i
        const match = text.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s)
        if (match) {
          try {
            const state = JSON.parse(match[1])
            const gigs = state?.search?.gigs || state?.searchResults?.gigs || []
            for (const gig of gigs) {
              if (gig?.title && gig?.price) {
                products.push({
                  name: gig.title,
                  price: parseFloat(gig.price) || 0,
                  rating: gig.rating || 0,
                  reviewCount: gig.reviews || 0,
                  salesCount: 0,
                  creator: gig.seller?.username || gig.username || 'Fiverr Seller',
                  url: gig.url || '',
                  isTrending: gig.isTrending || false,
                  tags: term,
                  avgMonthlySales: 0,
                  demandScore: 0,
                  supplyScore: 0,
                })
              }
            }
          } catch {}
        }
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  } catch (error: any) {
    console.error(`[Fiverr Scraper] Hata: ${error?.message || error}`)
  }

  return products
}

/**
 * AI kategorisi slug'ina gore urunleri filtrele
 */
function filterProductsByCategory(products: CapafyProduct[], categorySlug: string): CapafyProduct[] {
  if (!categorySlug || categorySlug === 'all') return products

  const keywords: Record<string, string[]> = {
    'prompt-engineering': ['prompt', 'chatgpt', 'claude', 'midjourney', 'gpt'],
    'ai-chatbot-agent': ['chatbot', 'agent', 'bot', 'assistant'],
    'ai-video-generation': ['video', 'sora', 'runway', 'animation'],
    'ai-image-generation': ['image', 'midjourney', 'dall-e', 'stable diffusion'],
    'ai-audio-voice': ['voice', 'audio', 'elevenlabs', 'music'],
    'ai-automation': ['automation', 'workflow', 'n8n', 'zapier'],
    'ai-development': ['development', 'api', 'langchain', 'integration'],
    'ai-marketing': ['marketing', 'content', 'seo', 'social media'],
    'ai-data-analytics': ['analytics', 'data', 'analysis', 'report'],
    'ai-education': ['course', 'tutorial', 'learning', 'education'],
    'ai-writing': ['writing', 'copywriting', 'blog', 'article'],
    'ai-business': ['business', 'productivity', 'enterprise'],
  }

  const categoryKeywords = keywords[categorySlug] || []
  if (categoryKeywords.length === 0) return products.slice(0, 3)

  return products.filter((p) =>
    categoryKeywords.some((kw) => p.name.toLowerCase().includes(kw) || p.tags.toLowerCase().includes(kw))
  ).slice(0, 5)
}

/**
 * Bir AI kategorisi icin veri ceker
 */
export async function fetchCapafyCategory(categorySlug: string): Promise<CapafyCategoryData | null> {
  const allProducts: CapafyProduct[] = []

  // 1. PromptBase'den cek
  const promptBaseProducts = await scrapePromptBase()
  allProducts.push(...promptBaseProducts)

  // 2. Fiverr'dan cek
  if (allProducts.length < 5) {
    const fiverrProducts = await scrapeFiverrAI()
    allProducts.push(...fiverrProducts)
  }

  // 3. Kategoriye gore filtrele
  const filtered = filterProductsByCategory(allProducts, categorySlug)

  if (filtered.length === 0) {
    // Kategoride urun yoksa, tum promptbase urunlerinden ilk 3
    const generic = allProducts.slice(0, 3)
    if (generic.length === 0) return null
    filtered.push(...generic)
  }

  const totalProducts = filtered.length
  const avgPrice = Math.round(filtered.reduce((s, p) => s + p.price, 0) / totalProducts)
  const avgRating = Math.round(filtered.reduce((s, p) => s + p.rating, 0) / totalProducts * 10) / 10
  const avgReviews = Math.round(filtered.reduce((s, p) => s + p.reviewCount, 0) / totalProducts)

  const nameMap: Record<string, string> = {
    'prompt-engineering': 'Prompt Mühendisligi',
    'ai-chatbot-agent': 'AI Chatbot & Agent',
    'ai-video-generation': 'AI Video Üretimi',
    'ai-image-generation': 'AI Görüntü Üretimi',
    'ai-audio-voice': 'AI Ses & Voice',
    'ai-automation': 'AI Otomasyon',
    'ai-development': 'AI Gelistirme',
    'ai-marketing': 'AI Pazarlama',
    'ai-data-analytics': 'AI Veri Analizi',
    'ai-education': 'AI Egitim',
    'ai-writing': 'AI Yazma',
    'ai-business': 'AI Is Araclari',
  }

  return {
    name: nameMap[categorySlug] || categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    slug: categorySlug,
    totalProducts,
    avgPrice,
    avgRating,
    avgReviews,
    products: filtered,
  }
}

/**
 * Tum Capafy AI kategorilerini ceker
 */
export async function fetchAllCapafyCategories(
  categorySlugs: string[]
): Promise<Map<string, CapafyCategoryData>> {
  const results = new Map<string, CapafyCategoryData>()

  // Tum kategoriler icin once ortak PromptBase + Fiverr verisini cek
  // (tekrar tekrar ayni siteyi cagirmamak icin)
  const allAIProducts: CapafyProduct[] = []
  const pbProducts = await scrapePromptBase()
  allAIProducts.push(...pbProducts)

  if (allAIProducts.length < 10) {
    const fvProducts = await scrapeFiverrAI()
    allAIProducts.push(...fvProducts)
  }

  for (const slug of categorySlugs) {
    const filtered = filterProductsByCategory(allAIProducts, slug)
    const products = filtered.length > 0 ? filtered : allAIProducts.slice(0, 3)

    if (products.length === 0) continue

    const totalProducts = products.length
    const avgPrice = Math.round(products.reduce((s, p) => s + p.price, 0) / totalProducts)
    const avgRating = Math.round(products.reduce((s, p) => s + p.rating, 0) / totalProducts * 10) / 10
    const avgReviews = Math.round(products.reduce((s, p) => s + p.reviewCount, 0) / totalProducts)

    const nameMap: Record<string, string> = {
      'prompt-engineering': 'Prompt Mühendisligi',
      'ai-chatbot-agent': 'AI Chatbot & Agent',
      'ai-video-generation': 'AI Video Üretimi',
      'ai-image-generation': 'AI Görüntü Üretimi',
      'ai-audio-voice': 'AI Ses & Voice',
      'ai-automation': 'AI Otomasyon',
      'ai-development': 'AI Gelistirme',
      'ai-marketing': 'AI Pazarlama',
      'ai-data-analytics': 'AI Veri Analizi',
      'ai-education': 'AI Egitim',
      'ai-writing': 'AI Yazma',
      'ai-business': 'AI Is Araclari',
    }

    results.set(slug, {
      name: nameMap[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      slug,
      totalProducts,
      avgPrice,
      avgRating,
      avgReviews,
      products,
    })
  }

  return results
}
