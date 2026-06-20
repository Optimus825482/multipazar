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
 * Google Trends API - google-trends-api paketi ile gerçek trend verisi
 * Not: interestOverTime 0-100 skalasinda relative deger doner (gercek absolute volume degil)
 * Bu degerler trend yonunu ve buyume oranini gostermek icin yeterlidir.
 */
import googleTrends from 'google-trends-api'

export async function fetchKeywordTrends(
  keyword: string,
  startDate: Date = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<TrendResult | null> {
  try {
    // Interest over time - MONTH resolution
    const result = await googleTrends.interestOverTime({
      keyword: [keyword],
      startTime: startDate,
      endTime: endDate,
      granularTimeResolution: false, // MONTH resolution
    })

    // Parse result
    let parsed: any
    const text = typeof result === 'string' ? result : JSON.stringify(result)
    try {
      parsed = JSON.parse(text)
    } catch {
      // Sometimes returns with )]}' prefix
      const cleaned = text.replace(/^\)\]\}',?\n?/, '')
      // If still starts with non-JSON, try to extract JSON
      const jsonMatch = cleaned.match(/\{.*\}/s)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        console.warn(`[Google Trends] "${keyword}" yanit JSON degil, atlaniyor`)
        return null
      }
    }

    const timelineData = parsed.default?.timelineData || []

    if (timelineData.length === 0) {
      console.warn(`[Google Trends] "${keyword}" icin veri bulunamadi`)
      return null
    }

    // Group by month
    const monthlyMap = new Map<string, number[]>()
    for (const item of timelineData) {
      const date = new Date(item.time * 1000)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const value = Array.isArray(item.value) ? item.value[0] || 0 : item.value || 0
      const existing = monthlyMap.get(month) || []
      existing.push(value)
      monthlyMap.set(month, existing)
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
    const firstVal = volumes[0] > 0 ? volumes[0] : 1
    const lastVal = volumes[volumes.length - 1] > 0 ? volumes[volumes.length - 1] : 1
    const growthRate = Math.round(((lastVal - firstVal) / firstVal) * 100)

    let peakMonth = monthlyData[0].month
    let peakVolume = monthlyData[0].volume
    for (const d of monthlyData) {
      if (d.volume > peakVolume) {
        peakVolume = d.volume
        peakMonth = d.month
      }
    }

    return { keyword, data: monthlyData, growthRate, avgVolume, peakMonth, peakVolume }
  } catch (error: any) {
    console.warn(`[Google Trends] "${keyword}" hatasi: ${error?.message || error}`)
    return null
  }
}

/**
 * Birden fazla anahtar kelime icin trend verisi ceker (paralel)
 */
export async function fetchMultipleTrends(
  keywords: string[]
): Promise<Map<string, TrendResult>> {
  const results = new Map<string, TrendResult>()

  // Rate limiting: 4 paralel, her batch sonrasi 2sn bekle
  const batchSize = 4
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((kw) => fetchKeywordTrends(kw))
    )
    for (let j = 0; j < batch.length; j++) {
      if (batchResults[j]) {
        results.set(batch[j], batchResults[j]!)
      }
    }
    if (i + batchSize < keywords.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return results
}

/**
 * Kategori slug'larindan arama terimleri olusturur
 * (Kisa, oz, yuksek hacimli terimler)
 */
export function getSearchTermsForCategory(slug: string, platform: string): string[] {
  const termMap: Record<string, Record<string, string[]>> = {
    gumroad: {
      'software-development': ['software development', 'SaaS', 'web development'],
      'business-money': ['small business', 'business plan', 'entrepreneur'],
      '3d-assets': ['3D modeling', '3D assets', 'Blender'],
      'design-graphics': ['graphic design', 'design resources'],
      'ai-prompts': ['ChatGPT', 'AI prompts', 'prompt engineering'],
      'notion-templates': ['Notion', 'Notion templates'],
      'video-production': ['video editing', 'Premiere Pro'],
      'music-audio': ['music production', 'audio plugins'],
      'game-development': ['game development', 'Unity', 'Unreal'],
      'writing-publishing': ['ebook', 'self publishing', 'writing'],
      'marketing-seo': ['digital marketing', 'SEO tools'],
      'self-development': ['personal development', 'productivity'],
    },
    udemy: {
      'software-development': ['web development', 'software development'],
      'data-science-ai': ['data science', 'machine learning', 'AI'],
      'business': ['business', 'entrepreneurship'],
      'it-certification': ['AWS certification', 'IT certification'],
      'design': ['UI UX design', 'graphic design'],
      'marketing': ['digital marketing', 'SEO'],
      'personal-development': ['personal development', 'leadership'],
      'photography': ['photography', 'video editing'],
      'health-fitness': ['fitness', 'health', 'nutrition'],
      'music': ['music production', 'guitar'],
      'language': ['language learning', 'English'],
      'academic': ['academic writing', 'research'],
    },
    capafy: {
      'prompt-engineering': ['prompt engineering', 'ChatGPT'],
      'ai-chatbot-agent': ['AI chatbot', 'AI agent'],
      'ai-video-generation': ['AI video', 'text to video'],
      'ai-image-generation': ['AI image', 'Midjourney', 'DALL-E'],
      'ai-audio-voice': ['AI voice', 'text to speech'],
      'ai-automation': ['AI automation', 'workflow automation'],
      'ai-development': ['AI API', 'LangChain'],
      'ai-marketing': ['AI marketing', 'AI content'],
      'ai-data-analytics': ['AI analytics', 'data analysis'],
      'ai-education': ['online learning', 'AI education'],
      'ai-writing': ['AI writing', 'AI copywriting'],
      'ai-business': ['AI business', 'AI tools'],
    },
  }

  return termMap[platform]?.[slug] || [slug.replace(/-/g, ' ')]
}
