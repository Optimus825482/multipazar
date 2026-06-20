import axios from 'axios'
import * as cheerio from 'cheerio'

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

const UDEMY_SEARCH_URL = 'https://www.udemy.com/courses/search/'
const UDEMY_BASE = 'https://www.udemy.com'

// User-Agent rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * Udemy kategori slug'ini arama terimine cevirir
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
 * Udemy kurs arama sayfasindan kurs verilerini ceker
 */
async function scrapeUdemyCategory(categorySlug: string): Promise<UdemyCourse[]> {
  const searchQuery = categoryToSearchQuery(categorySlug)
  const courses: UdemyCourse[] = []

  try {
    const url = `${UDEMY_SEARCH_URL}?q=${searchQuery}&p=1&page_size=20`
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(response.data)

    // Udemy'nin ilk yuklemede gonderdigi JSON data'yi bul
    // Udemy genelde <script> icine data-push-state veya benzeri bir JSON gomer
    let courseData: any[] = []

    // Yontem 1: window.__INITIAL_STATE__ veya benzeri global degisken
    const scripts = $('script').toArray()
    for (const script of scripts) {
      const text = $(script).html() || ''
      
      // Udemy'nin clientData JSON'i
      const match = text.match(/window\._data\s*=\s*({.+?});/s)
      if (match) {
        try {
          const data = JSON.parse(match[1])
          // Buradan course listesini cikar...
        } catch {}
      }

      // Udemy'nin server-side rendered HTML'indeki course card'lari bul
      const uniMatch = text.match(/"(unit|course)[^"]*"/gi)
      if (uniMatch && uniMatch.length > 5) {
        // JSON-LD yapisi
        const jsonldMatch = text.match(/"@type":"Product".*?"name":"([^"]+)".*?"price":"([^"]+)".*?/gs)
        if (jsonldMatch) {
          // parse edilecek
        }
      }
    }

    // Yontem 2: HTML'den direk course card'lari parse et
    $('.course-card--main, [data-purpose="course-card"], .course-list--container article').each((_, el) => {
      const name = $(el).find('[data-purpose="course-title-url"], .course-card--course-title').text().trim()
      const priceText = $(el).find('[data-purpose="price-text"], .price-text--container').text().trim()
      const ratingText = $(el).find('[data-purpose="rating-number"], .star-rating--rating-number').text().trim()
      const reviewsText = $(el).find('[data-purpose="reviews-count"], .star-rating--count').text().trim()
      const studentsText = $(el).find('.course-card--enrollment, .enrollment-count').text().trim()
      const instructorText = $(el).find('.course-card--instructor, .instructor-name').text().trim()
      const urlPath = $(el).find('a[href*="/course/"]').attr('href') || ''

      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0
      const rating = parseFloat(ratingText) || 0
      const reviewCount = parseInt(reviewsText.replace(/[^0-9]/g, '')) || 0
      const studentCount = parseInt(studentsText.replace(/[^0-9]/g, '')) || 0

      if (name && price > 0) {
        courses.push({
          name,
          price,
          rating,
          reviewCount,
          studentCount,
          instructor: instructorText || 'Udemy Instructor',
          url: urlPath.startsWith('http') ? urlPath : `${UDEMY_BASE}${urlPath}`,
          isTrending: false,
          tags: searchQuery,
          avgMonthlyEnroll: Math.round(studentCount / 12),
          demandScore: 0,
          supplyScore: 0,
        })
      }
    })

    // Yontem 3: Eger HTML parse basarisiz olursa API endpoint'ini dene
    if (courses.length === 0) {
      const apiUrl = `https://www.udemy.com/api-2.0/courses/?search=${searchQuery}&page=1&page_size=20&fields[course]=@all`
      const apiResponse = await axios.get(apiUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
          'Referer': `${UDEMY_SEARCH_URL}?q=${searchQuery}`,
        },
        timeout: 15000,
      })

      if (apiResponse.data?.results) {
        for (const item of apiResponse.data.results) {
          courses.push({
            name: item.title || '',
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
    }
  } catch (error) {
    console.error(`[Udemy Scraper] "${categorySlug}" hatasi:`, error instanceof Error ? error.message : error)
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
 * Tum Udemy kategorilerini ceker
 */
export async function fetchAllUdemyCategories(
  categorySlugs: string[]
): Promise<Map<string, UdemyCategoryData>> {
  const results = new Map<string, UdemyCategoryData>()

  for (const slug of categorySlugs) {
    const data = await fetchUdemyCategory(slug)
    if (data && data.courses.length > 0) {
      results.set(slug, data)
    }
    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return results
}
