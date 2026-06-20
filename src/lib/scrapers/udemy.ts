import cloudscraper from 'cloudscraper'

export interface UdemyCourse {
  name: string
  price: number
  rating: number
  reviewCount: number
  studentCount: number
  instructor: string
  url: string
  isTrending: boolean
  tags: string
  avgMonthlyEnroll?: number
  demandScore: number
  supplyScore: number
}

export interface UdemyCategoryData {
  name: string
  slug: string
  totalCourses: number
  avgPrice: number
  avgRating: number
  avgReviews: number
  courses: UdemyCourse[]
}

const UDEMY_BASE = 'https://www.udemy.com'

/**
 * Kategori slug -> Udemy arama terimi
 */
function categoryToSearchQuery(slug: string): string {
  const map: Record<string, string> = {
    'software-development': 'software-development',
    'data-science-ai': 'data-science',
    'business': 'business',
    'it-certification': 'it-certification',
    'design': 'design',
    'marketing': 'marketing',
    'personal-development': 'personal-development',
    'photography': 'photography',
    'health-fitness': 'health-fitness',
    'music': 'music',
    'language': 'language',
    'academic': 'academic',
  }
  return map[slug] || slug
}

/**
 * Cloudscraper ile Udemy API'den gerçek kurs verilerini çeker
 * Cloudflare korumasini otomatik bypass eder
 */
async function scrapeUdemyCategory(categorySlug: string): Promise<UdemyCourse[]> {
  const searchQuery = categoryToSearchQuery(categorySlug)
  const courses: UdemyCourse[] = []

  try {
    // Udemy public API - Cloudflare korumasini cloudscraper gecer
    const apiUrl = `https://www.udemy.com/api-2.0/courses/?search=${searchQuery}&page=1&page_size=15&fields[course]=@all&language=en`

    const response = await cloudscraper({
      uri: apiUrl,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `${UDEMY_BASE}/courses/search/?q=${searchQuery}`,
        'Origin': UDEMY_BASE,
      },
      timeout: 20000,
    })

    const data = typeof response === 'string' ? JSON.parse(response) : response

    if (data?.results) {
      for (const item of data.results) {
        if (!item.title) continue
        courses.push({
          name: item.title,
          price: parseFloat(item.price?.amount || '0') || 0,
          rating: item.avg_rating || 0,
          reviewCount: item.num_reviews || 0,
          studentCount: item.num_subscribers || 0,
          instructor: item.visible_instructors?.[0]?.display_name || 'Udemy Instructor',
          url: `${UDEMY_BASE}${item.url || ''}`,
          isTrending: item.is_published || false,
          tags: searchQuery,
          avgMonthlyEnroll: Math.round((item.num_subscribers || 0) / 12),
          demandScore: 0,
          supplyScore: 0,
        })
      }
    }
  } catch (error: any) {
    console.error(`[Udemy Scraper] "${categorySlug}" hatasi: ${error?.message || error}`)
  }

  return courses
}

/**
 * Bir kategori icin Udemy'den veri ceker ve analiz eder
 */
export async function fetchUdemyCategory(categorySlug: string): Promise<UdemyCategoryData | null> {
  const courses = await scrapeUdemyCategory(categorySlug)

  if (courses.length === 0) {
    return null
  }

  const totalCourses = courses.length
  const avgPrice = Math.round(courses.reduce((s, c) => s + c.price, 0) / totalCourses)
  const avgRating = Math.round(courses.reduce((s, c) => s + c.rating, 0) / totalCourses * 10) / 10
  const avgReviews = Math.round(courses.reduce((s, c) => s + c.reviewCount, 0) / totalCourses)

  return {
    name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    slug: categorySlug,
    totalCourses,
    avgPrice,
    avgRating,
    avgReviews,
    courses,
  }
}

/**
 * Tum Udemy kategorilerini ceker (paralel batch)
 */
export async function fetchAllUdemyCategories(
  categorySlugs: string[]
): Promise<Map<string, UdemyCategoryData>> {
  const results = new Map<string, UdemyCategoryData>()

  // 4 paralel, rate limiting
  const batchSize = 4
  for (let i = 0; i < categorySlugs.length; i += batchSize) {
    const batch = categorySlugs.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((slug) => fetchUdemyCategory(slug))
    )
    for (let j = 0; j < batch.length; j++) {
      if (batchResults[j]) {
        results.set(batch[j], batchResults[j]!)
      }
    }
    if (i + batchSize < categorySlugs.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  return results
}
