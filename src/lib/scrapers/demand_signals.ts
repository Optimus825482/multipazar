/**
 * ALTERNATIF TALEP KAYNAKLARI v2
 *
 * Google Trends relative (0-100 popularity score) yerine bu kaynaklar MUTLAK
 * talep sinyalleri sağlar. Talep doğrulaması ve cross-check için kullanılır.
 *
 * Kaynaklar:
 * 1. Reddit JSON API — subreddit mention/engagement (talep göstergesi)
 * 2. YouTube Trending RSS — kategorize edilmiş trend videolar (talep kanıtı)
 *
 * Ücretsiz, scraping kolay, ToS ile uyumlu (Reddit JSON public, YouTube RSS public).
 *
 * NOT: Bu sinyaller Google Trends'in yerine geçmez, onu TAMAMLAYıCı niteliktedir.
 * TrendingSignal tablosuna yazılır, scoring bunları kullanabilir.
 */

import { db } from '@/lib/db'

const REDDIT_BASE = 'https://www.reddit.com'
const YOUTUBE_TRENDING_RSS = 'https://www.youtube.com/feeds/trending_breaking.rss'

export interface RedditSignal {
  keyword: string
  subreddit: string
  postCount: number
  topPostScore: number
  topPostUrl: string | null
  fetchedAt: string
}

export interface YouTubeTrendingSignal {
  videoId: string
  title: string
  channel: string
  publishedAt: string
  categoryKeyword?: string
}

/**
 * Reddit'te belirli bir anahtar kelime için arama yapar.
 * JSON API (OAuth gerektirmez, public endpoint).
 *
 * Rate limit: Reddit saniyede 10 istek kabul eder (anonim). Aralarına 1 sn bekleme.
 */
export async function fetchRedditMentions(
  keyword: string,
  subreddits: string[] = ['all', 'technology', 'ChatGPT', 'artificial', 'programming']
): Promise<RedditSignal[]> {
  const signals: RedditSignal[] = []

  for (const sub of subreddits) {
    try {
      const url = `${REDDIT_BASE}/r/${sub}/search.json?q=${encodeURIComponent(keyword)}&sort=new&t=month&limit=25`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MULPAZ-Research/1.0 (market-research-tool)',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        // 429 rate limit → sessizce devam
        if (response.status === 429) {
          console.warn(`[Reddit] "${keyword}" r/${sub} 429 (rate limit)`)
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
        continue
      }

      const data = await response.json()
      const posts = data?.data?.children || []
      if (posts.length === 0) continue

      const topScore = Math.max(...posts.map((p: any) => p?.data?.score || 0))
      const topPost = posts.find((p: any) => (p?.data?.score || 0) === topScore)
      signals.push({
        keyword,
        subreddit: sub,
        postCount: posts.length,
        topPostScore: topScore,
        topPostUrl: topPost?.data?.url || null,
        fetchedAt: new Date().toISOString(),
      })

      await new Promise((resolve) => setTimeout(resolve, 1100)) // Reddit rate limit
    } catch (error: any) {
      console.warn(`[Reddit] "${keyword}" r/${sub} hata: ${error?.message || error}`)
    }
  }

  return signals
}

/**
 * YouTube Trending RSS'i parse eder (XML döner, JSON'a çevir).
 *
 * Ücretsiz, public, auth gerektirmez.
 * Kategorize etmek için title'dan keyword çıkarımı yapılır.
 */
export async function fetchYouTubeTrending(): Promise<YouTubeTrendingSignal[]> {
  try {
    const response = await fetch(YOUTUBE_TRENDING_RSS, {
      headers: {
        'User-Agent': 'MULPAZ-Research/1.0',
        'Accept': 'application/atom+xml, application/rss+xml, application/xml',
      },
    })

    if (!response.ok) {
      console.warn(`[YouTube Trending] HTTP ${response.status}`)
      return []
    }

    const xml = await response.text()
    return parseAtomFeed(xml)
  } catch (error: any) {
    console.warn(`[YouTube Trending] hata: ${error?.message || error}`)
    return []
  }
}

function parseAtomFeed(xml: string): YouTubeTrendingSignal[] {
  const signals: YouTubeTrendingSignal[] = []
  // Basit regex parser — XML kütüphanesi eklemeden iş görür
  const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
  for (const m of entryMatches) {
    const entry = m[1]
    const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || ''
    const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1] || ''
    const channel = (entry.match(/<name>([^<]+)<\/name>/) || [])[1] || ''
    const publishedAt = (entry.match(/<published>([^<]+)<\/published>/) || [])[1] || ''
    if (videoId && title) {
      signals.push({ videoId, title, channel, publishedAt })
    }
  }
  return signals
}

/**
 * Tüm ek talep kaynaklarını çalıştırıp TrendingSignal tablosuna kaydeder.
 *
 * Strateji:
 * - Her kategori için anahtar kelime listesi
 * - Reddit: subreddit mention sayısı (mutlak talep sinyali)
 * - YouTube: trending video title'larında kategori keyword kontrolü
 */
export async function fetchAlternativeDemandSignals(
  categoryKeywords: Array<{ categorySlug: string; platform: string; keywords: string[] }>
): Promise<{ redditSignals: number; youtubeSignals: number; errors: string[] }> {
  let redditSignals = 0
  let youtubeSignals = 0
  const errors: string[] = []

  // 1. YouTube Trending — tüm kategoriler için bir kez çek
  try {
    const ytVideos = await fetchYouTubeTrending()
    const now = new Date()

    for (const { categorySlug, platform, keywords } of categoryKeywords) {
      for (const video of ytVideos) {
        // Title'da herhangi bir keyword geçiyorsa eşleştir
        const matchedKeyword = keywords.find((k) =>
          video.title.toLowerCase().includes(k.toLowerCase())
        )
        if (matchedKeyword) {
          try {
            await db.trendingSignal.create({
              data: {
                platform,
                categorySlug,
                keyword: matchedKeyword,
                signalSource: 'youtube_trending',
                metricName: 'video_count',
                metricValue: 1,
                rawJson: JSON.stringify(video),
                observedAt: now,
              },
            })
            youtubeSignals++
          } catch (e: any) {
            errors.push(`youtube ${categorySlug}: ${e?.message || e}`)
          }
        }
      }
    }
  } catch (e: any) {
    errors.push(`youtube_trending: ${e?.message || e}`)
  }

  // 2. Reddit — her kategori için mention sayısı
  for (const { categorySlug, platform, keywords } of categoryKeywords) {
    for (const keyword of keywords) {
      try {
        const mentions = await fetchRedditMentions(keyword)
        if (mentions.length === 0) continue

        // Aggregate: toplam mention sayısı, en yüksek score
        const totalPosts = mentions.reduce((sum, m) => sum + m.postCount, 0)
        const maxScore = Math.max(...mentions.map((m) => m.topPostScore))
        const now = new Date()

        // Her subreddit için ayrı sinyal yaz (debug için)
        for (const m of mentions) {
          try {
            await db.trendingSignal.create({
              data: {
                platform,
                categorySlug,
                keyword,
                signalSource: `reddit_${m.subreddit}`,
                metricName: 'post_count',
                metricValue: m.postCount,
                rawJson: JSON.stringify(m),
                observedAt: now,
              },
            })
            redditSignals++
          } catch (e: any) {
            errors.push(`reddit ${categorySlug}/${m.subreddit}: ${e?.message || e}`)
          }
        }

        // Toplam mention'ı aggregate olarak yaz
        try {
          await db.trendingSignal.create({
            data: {
              platform,
              categorySlug,
              keyword,
              signalSource: 'reddit_aggregate',
              metricName: 'post_count_total',
              metricValue: totalPosts,
              rawJson: JSON.stringify({ totalPosts, maxScore }),
              observedAt: now,
            },
          })
        } catch (e: any) {
          errors.push(`reddit aggregate ${categorySlug}: ${e?.message || e}`)
        }
      } catch (e: any) {
        errors.push(`reddit ${categorySlug}/${keyword}: ${e?.message || e}`)
      }
    }
  }

  return { redditSignals, youtubeSignals, errors }
}

/**
 * Capafy kategorileri için keyword listesi
 */
export function getCapafyKeywords(): Array<{ categorySlug: string; platform: string; keywords: string[] }> {
  return [
    { categorySlug: 'prompt-engineering', platform: 'capafy', keywords: ['prompt engineering', 'system prompt', 'GPT prompt'] },
    { categorySlug: 'ai-chatbot-agent', platform: 'capafy', keywords: ['AI chatbot', 'AI agent', 'GPT agent'] },
    { categorySlug: 'ai-video-generation', platform: 'capafy', keywords: ['AI video', 'Sora', 'Runway'] },
    { categorySlug: 'ai-image-generation', platform: 'capafy', keywords: ['AI image', 'Midjourney', 'Stable Diffusion'] },
    { categorySlug: 'ai-audio-voice', platform: 'capafy', keywords: ['AI voice', 'ElevenLabs', 'voice cloning'] },
    { categorySlug: 'ai-automation', platform: 'capafy', keywords: ['AI automation', 'n8n', 'workflow automation'] },
    { categorySlug: 'ai-development', platform: 'capafy', keywords: ['LangChain', 'AI SDK', 'AI coding'] },
    { categorySlug: 'ai-marketing', platform: 'capafy', keywords: ['AI marketing', 'AI advertising'] },
    { categorySlug: 'ai-data-analytics', platform: 'capafy', keywords: ['AI analytics', 'AI data'] },
    { categorySlug: 'ai-education', platform: 'capafy', keywords: ['AI education', 'AI tutor'] },
    { categorySlug: 'ai-writing', platform: 'capafy', keywords: ['AI writing', 'AI copywriting', 'AI writer'] },
    { categorySlug: 'ai-business', platform: 'capafy', keywords: ['AI business', 'productivity AI'] },
  ]
}

/**
 * Gumroad kategorileri için keyword listesi
 */
export function getGumroadKeywords(): Array<{ categorySlug: string; platform: string; keywords: string[] }> {
  return [
    { categorySlug: 'software-development', platform: 'gumroad', keywords: ['software development', 'SaaS', 'API template'] },
    { categorySlug: 'business-money', platform: 'gumroad', keywords: ['business plan', 'financial model', 'startup'] },
    { categorySlug: '3d-assets', platform: 'gumroad', keywords: ['3D model', 'Blender', 'game assets'] },
    { categorySlug: 'design-graphics', platform: 'gumroad', keywords: ['UI kit', 'design template', 'Figma'] },
    { categorySlug: 'ai-prompts', platform: 'gumroad', keywords: ['ChatGPT prompt', 'Midjourney prompt', 'AI prompt'] },
    { categorySlug: 'notion-templates', platform: 'gumroad', keywords: ['Notion template', 'Notion dashboard', 'Notion system'] },
    { categorySlug: 'video-production', platform: 'gumroad', keywords: ['video editing', 'motion graphics', 'After Effects'] },
    { categorySlug: 'music-audio', platform: 'gumroad', keywords: ['music production', 'sample pack', 'Ableton'] },
    { categorySlug: 'game-development', platform: 'gumroad', keywords: ['Unity asset', 'Unreal asset', 'game development'] },
    { categorySlug: 'writing-publishing', platform: 'gumroad', keywords: ['ebook', 'self-publishing', 'KDP'] },
    { categorySlug: 'marketing-seo', platform: 'gumroad', keywords: ['digital marketing', 'SEO', 'marketing template'] },
    { categorySlug: 'self-development', platform: 'gumroad', keywords: ['personal development', 'productivity', 'self improvement'] },
  ]
}
