import googleTrends from 'google-trends-api'

export interface TrendPoint {
  month: string
  volume: number
}

export interface TrendResult {
  keyword: string
  data: TrendPoint[]
  growthRate: number
  avgVolume: number
  peakMonth: string
  peakVolume: number
}

/**
 * Google Trends API ile gerçek trend verisi çeker
 * Her kategori/anahtar kelime icin aylik arama hacmi trendini dondurur
 */
export async function fetchKeywordTrends(
  keyword: string,
  startDate: Date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<TrendResult | null> {
  try {
    const result = await googleTrends.interestOverTime({
      keyword,
      startTime: startDate,
      endTime: endDate,
      granularTimeResolution: true,
    })

    const parsed = JSON.parse(result)
    const timelineData = parsed.default?.timelineData || []

    if (timelineData.length === 0) {
      console.warn(`[Google Trends] "${keyword}" icin veri bulunamadi`)
      return null
    }

    const data: TrendPoint[] = timelineData.map((item: any) => {
      const date = new Date(item.time * 1000)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return {
        month,
        volume: item.value[0] || 0,
      }
    })

    // Aylara gore grupla (gunluk veriyi aylik yap)
    const monthlyMap = new Map<string, number[]>()
    for (const point of data) {
      const existing = monthlyMap.get(point.month) || []
      existing.push(point.volume)
      monthlyMap.set(point.month, existing)
    }

    const monthlyData: TrendPoint[] = []
    for (const [month, volumes] of monthlyMap) {
      monthlyData.push({
        month,
        volume: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length),
      })
    }
    monthlyData.sort((a, b) => a.month.localeCompare(b.month))

    const volumes = monthlyData.map((d) => d.volume)
    const avgVolume = Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
    const firstVal = volumes[0] || 1
    const lastVal = volumes[volumes.length - 1] || 1
    const growthRate = Math.round(((lastVal - firstVal) / firstVal) * 100)

    // En yuksek aylik hacim
    let peakMonth = monthlyData[0].month
    let peakVolume = monthlyData[0].volume
    for (const d of monthlyData) {
      if (d.volume > peakVolume) {
        peakVolume = d.volume
        peakMonth = d.month
      }
    }

    return {
      keyword,
      data: monthlyData,
      growthRate,
      avgVolume,
      peakMonth,
      peakVolume,
    }
  } catch (error) {
    console.error(`[Google Trends] "${keyword}" hatasi:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Birden fazla anahtar kelime icin trend verisi ceker
 */
export async function fetchMultipleTrends(
  keywords: string[]
): Promise<Map<string, TrendResult>> {
  const results = new Map<string, TrendResult>()

  // Google Trends rate limiting'e takilmamak icin sirayla cek
  for (const keyword of keywords) {
    const trend = await fetchKeywordTrends(keyword)
    if (trend) {
      results.set(keyword, trend)
    }
    // 1 saniye bekle (rate limiting)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return results
}

/**
 * Kategori slug'larindan arama terimleri olusturur
 */
export function getSearchTermsForCategory(slug: string, platform: string): string[] {
  const termMap: Record<string, Record<string, string[]>> = {
    gumroad: {
      'software-development': ['software development tools', 'SaaS template'],
      'business-money': ['business plan template', 'financial model'],
      '3d-assets': ['3D model marketplace', 'Blender asset'],
      'design-graphics': ['design template', 'graphic design resources'],
      'ai-prompts': ['AI prompt pack', 'ChatGPT prompts'],
      'notion-templates': ['Notion template', 'Notion dashboard'],
      'video-production': ['video editing template', 'Premiere Pro'],
      'music-audio': ['music production template', 'audio preset'],
      'game-development': ['game development asset', 'Unity asset'],
      'writing-publishing': ['ebook template', 'writing guide'],
      'marketing-seo': ['marketing template', 'SEO tool'],
      'self-development': ['self development course', 'productivity guide'],
    },
    udemy: {
      'software-development': ['software development course', 'web development bootcamp'],
      'data-science-ai': ['data science course', 'machine learning'],
      'business': ['business course', 'entrepreneurship'],
      'it-certification': ['IT certification', 'AWS course'],
      'design': ['UI UX design course', 'graphic design'],
      'marketing': ['digital marketing course', 'SEO'],
      'personal-development': ['personal development', 'leadership'],
      'photography': ['photography course', 'video editing'],
      'health-fitness': ['health fitness course', 'nutrition'],
      'music': ['music production course', 'audio engineering'],
      'language': ['language learning', 'English course'],
      'academic': ['academic writing', 'research methodology'],
    },
    capafy: {
      'prompt-engineering': ['prompt engineering', 'ChatGPT prompts'],
      'ai-chatbot-agent': ['AI agent', 'chatbot development'],
      'ai-video-generation': ['AI video generation', 'Sora AI'],
      'ai-image-generation': ['AI image generation', 'Midjourney'],
      'ai-audio-voice': ['AI voice cloning', 'ElevenLabs'],
      'ai-automation': ['AI automation', 'n8n workflow'],
      'ai-development': ['AI API integration', 'LangChain'],
      'ai-marketing': ['AI marketing tool', 'AI content'],
      'ai-data-analytics': ['AI data analysis', 'AI analytics'],
      'ai-education': ['AI learning path', 'AI tutorial'],
      'ai-writing': ['AI writing tool', 'AI copywriting'],
      'ai-business': ['AI business tool', 'AI productivity'],
    },
  }

  return termMap[platform]?.[slug] || [`${slug.replace(/-/g, ' ')}`]
}
