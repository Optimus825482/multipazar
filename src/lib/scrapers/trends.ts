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
 * Google Trends - dogrudan trends.google.com API'ine istek atar
 * 
 * google-trends-api npm paketi yerine dogrudan fetch kullaniyoruz
 * cunku paket rate-limit'te HTML dondurup JSON parse hatasina yol aciyor.
 * 
 * Endpoint: https://trends.google.com/trends/api/explore
 * Cevap: )]}' prefixli JSON
 */

const GT_BASE = 'https://trends.google.com/trends/api'
const GT_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000

let googleTrendsCooldownUntil = 0

function isGoogleTrendsCoolingDown(): boolean {
  return Date.now() < googleTrendsCooldownUntil
}

function startGoogleTrendsCooldown(keyword: string, status: number) {
  googleTrendsCooldownUntil = Date.now() + GT_RATE_LIMIT_COOLDOWN_MS
  console.warn(
    `[Google Trends] "${keyword}" HTTP ${status}; ${Math.round(GT_RATE_LIMIT_COOLDOWN_MS / 60000)} dk cooldown baslatildi`
  )
}

export async function fetchKeywordTrends(
  keyword: string
): Promise<TrendResult | null> {
  try {
    if (isGoogleTrendsCoolingDown()) {
      return null
    }

    // 1. Explore API - trend widget bilgisini al
    const exploreUrl = `${GT_BASE}/explore?hl=en-US&tz=-180&req=${encodeURIComponent(JSON.stringify({
      comparisonItem: [{ keyword, geo: '', time: 'today 12-m' }],
      category: 0,
      property: '',
    }))}`

    const exploreRes = await fetch(exploreUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://trends.google.com',
        'Accept': 'application/json, text/plain, */*',
      },
    })

    if (!exploreRes.ok) {
      if (exploreRes.status === 429) {
        startGoogleTrendsCooldown(keyword, exploreRes.status)
        return null
      }
      console.warn(`[Google Trends] "${keyword}" explore HTTP ${exploreRes.status}`)
      return null
    }

    const exploreText = await exploreRes.text()
    const exploreJson = exploreText.replace(/^\)\]\}',?\n?/, '')

    let exploreData: any
    try {
      exploreData = JSON.parse(exploreJson)
    } catch {
      console.warn(`[Google Trends] "${keyword}" explore JSON parse hatasi`)
      return null
    }

    // Widget'lardan TIMESERIES widget'ini bul
    const widgets = exploreData?.widgets || []
    const timelineWidget = widgets.find((w: any) => w.id === 'TIMESERIES')

    if (!timelineWidget?.token) {
      console.warn(`[Google Trends] "${keyword}" TIMESERIES widget bulunamadi`)
      return null
    }

    // 2. Widget data endpoint - asil trend verisini al
    const widgetUrl = `${GT_BASE}/widgetdata/multiline?hl=en-US&tz=-180&req=${encodeURIComponent(JSON.stringify(timelineWidget.request))}&token=${timelineWidget.token}`

    const widgetRes = await fetch(widgetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://trends.google.com',
        'Accept': 'application/json, text/plain, */*',
      },
    })

    if (!widgetRes.ok) {
      if (widgetRes.status === 429) {
        startGoogleTrendsCooldown(keyword, widgetRes.status)
        return null
      }
      console.warn(`[Google Trends] "${keyword}" widget HTTP ${widgetRes.status}`)
      return null
    }

    const widgetText = await widgetRes.text()
    const widgetJson = widgetText.replace(/^\)\]\}',?\n?/, '')

    let widgetData: any
    try {
      widgetData = JSON.parse(widgetJson)
    } catch {
      console.warn(`[Google Trends] "${keyword}" widget JSON parse hatasi`)
      return null
    }

    const lines = widgetData?.default?.timelineData || []
    if (lines.length === 0) {
      return null
    }

    // Gunluk veriyi aylik grupla
    const monthlyMap = new Map<string, number[]>()
    for (const item of lines) {
      const date = new Date(item.time * 1000)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const val = Array.isArray(item.value) ? item.value[0] || 0 : item.value || 0
      const existing = monthlyMap.get(month) || []
      existing.push(val)
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

    if (monthlyData.length === 0) return null

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
 * Birden fazla anahtar kelime icin trend verisi ceker
 * Rate limiting - sequential, her biri arasi 2sn bekleme (429 onlemek icin)
 */
export async function fetchMultipleTrends(
  keywords: string[]
): Promise<Map<string, TrendResult>> {
  const results = new Map<string, TrendResult>()

  // Sequential - her seferinde 1 istek, 2sn bekle
  // Google Trends 429 hatasini onlemek icin paralellik yok
  for (const keyword of keywords) {
    if (isGoogleTrendsCoolingDown()) {
      console.warn('[Google Trends] Cooldown aktif; kalan trend istekleri atlandi')
      break
    }

    const trend = await fetchKeywordTrends(keyword)
    if (trend) {
      results.set(keyword, trend)
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return results
}

/**
 * Kategori slug'larindan arama terimleri
 * AZALTILDI - her kategori icin 1 terim (rate limit'i onlemek icin)
 */
export function getSearchTermsForCategory(slug: string, platform: string): string[] {
  const termMap: Record<string, Record<string, string[]>> = {
    gumroad: {
      'software-development': ['software development'],
      'business-money': ['small business'],
      '3d-assets': ['3D modeling'],
      'design-graphics': ['graphic design'],
      'ai-prompts': ['ChatGPT'],
      'notion-templates': ['Notion'],
      'video-production': ['video editing'],
      'music-audio': ['music production'],
      'game-development': ['game development'],
      'writing-publishing': ['ebook'],
      'marketing-seo': ['digital marketing'],
      'self-development': ['personal development'],
    },
    udemy: {
      'software-development': ['web development'],
      'data-science-ai': ['data science'],
      'business': ['business'],
      'it-certification': ['IT certification'],
      'design': ['UI UX design'],
      'marketing': ['digital marketing'],
      'personal-development': ['personal development'],
      'photography': ['photography'],
      'health-fitness': ['fitness'],
      'music': ['music production'],
      'language': ['language learning'],
      'academic': ['academic writing'],
    },
    capafy: {
      'prompt-engineering': ['prompt engineering'],
      'ai-chatbot-agent': ['AI chatbot'],
      'ai-video-generation': ['AI video'],
      'ai-image-generation': ['AI image'],
      'ai-audio-voice': ['AI voice'],
      'ai-automation': ['AI automation'],
      'ai-development': ['AI development'],
      'ai-marketing': ['AI marketing'],
      'ai-data-analytics': ['AI analytics'],
      'ai-education': ['AI education'],
      'ai-writing': ['AI writing'],
      'ai-business': ['AI business'],
    },
  }

  return termMap[platform]?.[slug] || [slug.replace(/-/g, ' ')]
}
