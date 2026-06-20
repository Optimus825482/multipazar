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

const CAPAFY_API = 'https://api.capafy.ai'

/**
 * Capafy.ai search API'sinden gerçek agent/skill verilerini çeker
 * POST /agent/agents/search - query body'de JSON olarak gönderilir
 * Not: pageSize parametresi query string'de, query body'de JSON icinde
 */
async function searchCapafy(query: string, pageSize: number = 10): Promise<CapafyProduct[]> {
  const products: CapafyProduct[] = []

  try {
    const url = `${CAPAFY_API}/agent/agents/search?pageSize=${pageSize}&page=1`
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
      console.warn(`[Capafy API] "${query}" HTTP ${response.status}`)
      return products
    }

    const body = await response.json()

    // R<T> envelope: { code: 0, msg: "ok", data: { list: [...] } }
    if (body.code !== 0 || !body.data) {
      console.warn(`[Capafy API] "${query}" error: ${body.msg}`)
      return products
    }

    const agents = body.data.list || []

    for (const agent of agents) {
      const name = agent.title || ''
      const price = parseFloat(agent.billings?.[0]?.cyclePrice || agent.billings?.[0]?.oneTimeFee || '0')
      const rating = parseFloat(agent.rating || '0')
      const reviewCount = parseInt(agent.agentCard?.reviewCount || '0')
      const salesCount = parseInt(agent.salesVolume || '0')
      const creator = agent.developerName || agent.agentCard?.developerName || 'Capafy Creator'
      const tags = agent.tags || query
      const urlSuffix = agent.urlSuffix

      if (name && price > 0) {
        products.push({
          name,
          price,
          rating: rating > 5 ? rating / 2 : rating,
          reviewCount,
          salesCount,
          creator,
          url: urlSuffix ? `https://capafy.ai/agent/${urlSuffix}` : `https://capafy.ai/agent/${agent.agentId}`,
          isTrending: salesCount > 10,
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

const CATEGORY_QUERIES: Record<string, string> = {
  'prompt-engineering': 'prompt engineering',
  'ai-chatbot-agent': 'AI chatbot agent assistant',
  'ai-video-generation': 'AI video generation',
  'ai-image-generation': 'AI image generation',
  'ai-audio-voice': 'AI voice audio speech',
  'ai-automation': 'AI automation workflow',
  'ai-development': 'AI development API',
  'ai-marketing': 'AI marketing content',
  'ai-data-analytics': 'AI data analytics',
  'ai-education': 'AI education learning',
  'ai-writing': 'AI writing copywriting',
  'ai-business': 'AI business productivity',
}

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

export async function fetchCapafyCategory(categorySlug: string): Promise<CapafyCategoryData | null> {
  const query = CATEGORY_QUERIES[categorySlug] || categorySlug.replace(/-/g, ' ')
  const products = await searchCapafy(query, 10)

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

export async function fetchAllCapafyCategories(
  categorySlugs: string[]
): Promise<Map<string, CapafyCategoryData>> {
  const results = new Map<string, CapafyCategoryData>()

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
