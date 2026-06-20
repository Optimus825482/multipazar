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

/**
 * Capafy.ai - Gerçek AI Agent/Skills Marketplace API'si
 * API Base: https://api.capafy.ai
 * 
 * Endpoint: POST /agent/agents/search
 * - query: dogal dil arama sorgusu
 * - Sayfalanmis sonuc doner
 * - Public endpoint, API key gerekmez
 */

const CAPAFY_API = 'https://api.capafy.ai'

/**
 * Capafy.ai search API'sinden gerçek agent/skill verilerini çeker
 */
async function searchCapafy(query: string, pageSize: number = 10): Promise<CapafyProduct[]> {
  const products: CapafyProduct[] = []

  try {
    const response = await fetch(`${CAPAFY_API}/agent/agents/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&page=1`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`[Capafy API] "${query}" HTTP ${response.status}`)
      return products
    }

    const body = await response.json()
    
    // R<T> envelope: { code: 0, msg: "success", data: {...} }
    if (body.code !== 0 || !body.data) {
      console.warn(`[Capafy API] "${query}" business error: ${body.msg}`)
      return products
    }

    const agents = body.data.records || body.data.items || body.data.agents || []
    
    for (const agent of agents) {
      const name = agent.name || agent.title || ''
      const price = parseFloat(agent.price || agent.pricing?.amount || '0')
      const rating = parseFloat(agent.rating || agent.stars || '0')
      const reviewCount = parseInt(agent.reviewCount || agent.reviews || '0')
      const salesCount = parseInt(agent.salesCount || agent.sales || '0')
      const creator = agent.creator?.name || agent.author?.name || agent.vendor?.name || 'Capafy Creator'
      const url = agent.url || agent.agentUrl || ''
      const tags = (agent.tags || agent.categories || []).join(',') || query

      if (name && price > 0) {
        products.push({
          name,
          price,
          rating: rating > 5 ? rating / 2 : rating, // normalize 0-5
          reviewCount,
          salesCount,
          creator,
          url: url.startsWith('http') ? url : `https://capafy.ai${url}`,
          isTrending: agent.isTrending || agent.trending || false,
          tags,
          avgMonthlySales: salesCount > 0 ? Math.round(salesCount / 3) : 0,
          demandScore: 0,
          supplyScore: 0,
        })
      }
    }
  } catch (error: any) {
    console.error(`[Capafy API] "${query}" hatasi: ${error?.message || error}`)
  }

  return products
}

/**
 * Kategori slug -> sorgu terimi
 */
function categoryToQuery(slug: string): string {
  const map: Record<string, string> = {
    'prompt-engineering': 'prompt engineering ChatGPT',
    'ai-chatbot-agent': 'AI chatbot agent assistant',
    'ai-video-generation': 'AI video generation Sora',
    'ai-image-generation': 'AI image generation Midjourney',
    'ai-audio-voice': 'AI voice audio ElevenLabs',
    'ai-automation': 'AI automation workflow n8n',
    'ai-development': 'AI development LangChain API',
    'ai-marketing': 'AI marketing content SEO',
    'ai-data-analytics': 'AI data analytics analysis',
    'ai-education': 'AI education learning course',
    'ai-writing': 'AI writing copywriting content',
    'ai-business': 'AI business productivity tool',
  }
  return map[slug] || slug.replace(/-/g, ' ')
}

/**
 * Kategori adi mapping
 */
const CATEGORY_NAMES: Record<string, string> = {
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

/**
 * Bir AI kategorisi icin Capafy'den veri ceker
 */
export async function fetchCapafyCategory(categorySlug: string): Promise<CapafyCategoryData | null> {
  const query = categoryToQuery(categorySlug)
  const products = await searchCapafy(query, 15)

  if (products.length === 0) {
    return null
  }

  const totalProducts = products.length
  const avgPrice = Math.round(products.reduce((s, p) => s + p.price, 0) / totalProducts)
  const avgRating = Math.round(products.reduce((s, p) => s + p.rating, 0) / totalProducts * 10) / 10
  const avgReviews = Math.round(products.reduce((s, p) => s + p.reviewCount, 0) / totalProducts)

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
 * Tum Capafy kategorilerini ceker (paralel batch)
 */
export async function fetchAllCapafyCategories(
  categorySlugs: string[]
): Promise<Map<string, CapafyCategoryData>> {
  const results = new Map<string, CapafyCategoryData>()

  // 4 paralel, rate limiting
  const batchSize = 4
  for (let i = 0; i < categorySlugs.length; i += batchSize) {
    const batch = categorySlugs.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((slug) => fetchCapafyCategory(slug))
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
