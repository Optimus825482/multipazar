import puppeteer, { Browser } from 'puppeteer'

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

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    })
  }
  return browser
}

async function closeBrowser() {
  if (browser) {
    await browser.close()
    browser = null
  }
}

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
 * Puppeteer ile Udemy'ye baglan, Cloudflare'i gec, kurs verilerini sayfadan parse et
 */
async function scrapeUdemyCategory(categorySlug: string): Promise<UdemyCourse[]> {
  const searchQuery = categoryToSearchQuery(categorySlug)
  const courses: UdemyCourse[] = []

  try {
    const page = await (await getBrowser()).newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1366, height: 768 })

    // Cloudflare korumasini gecmek icin once ana sayfaya git
    await page.goto(`${UDEMY_BASE}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 2000))

    // Asil arama sayfasina git
    const url = `${UDEMY_BASE}/courses/search/?q=${searchQuery}&p=1&page_size=20`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 3000))

    // Kurs listesini sayfadan parse et
    const items = await page.evaluate(() => {
      const results: any[] = []

      // Udemy course card'larini bul
      const cards = document.querySelectorAll('[class*="course-card"], [data-purpose="course-card"], [class*="card"]')
      cards.forEach((card) => {
        const titleEl = card.querySelector('[data-purpose="course-title-url"], [class*="title"]')
        const priceEl = card.querySelector('[data-purpose="price-text"], [class*="price"]')
        const ratingEl = card.querySelector('[data-purpose="rating-number"], [class*="rating-number"]')
        const studentsEl = card.querySelector('[class*="enrollment"], [class*="student"]')
        const instructorEl = card.querySelector('[class*="instructor"]')
        const linkEl = card.querySelector('a[href*="/course/"]')

        if (titleEl?.textContent) {
          results.push({
            name: titleEl.textContent.trim(),
            price: priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0',
            rating: ratingEl?.textContent?.trim() || '0',
            students: studentsEl?.textContent?.replace(/[^0-9k]/g, '').replace('k', '000') || '0',
            instructor: instructorEl?.textContent?.trim() || '',
            url: (linkEl as HTMLAnchorElement)?.href || '',
          })
        }
      })

      return results
    })

    for (const item of items) {
      if (!item.name) continue
      const price = parseFloat(item.price) || 0
      const rating = parseFloat(item.rating) || 0
      let studentCount = parseInt(item.students) || 0
      if (item.students.includes('k')) {
        studentCount = Math.round(parseFloat(item.students) * 1000)
      }

      courses.push({
        name: item.name,
        price,
        rating,
        reviewCount: 0,
        studentCount,
        instructor: item.instructor || 'Udemy Instructor',
        url: item.url,
        isTrending: false,
        tags: searchQuery,
        avgMonthlyEnroll: studentCount > 0 ? Math.round(studentCount / 12) : 0,
        demandScore: 0,
        supplyScore: 0,
      })
    }

    // Eger card'lardan parse edilemediyse, sayfadaki tum linkleri dene
    if (courses.length === 0) {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/course/"]'))
          .slice(0, 15)
          .map((a) => ({
            name: a.textContent?.trim() || '',
            url: (a as HTMLAnchorElement).href,
          }))
          .filter((l) => l.name.length > 10)
      })

      for (const link of links) {
        courses.push({
          name: link.name,
          price: 0,
          rating: 0,
          reviewCount: 0,
          studentCount: 0,
          instructor: 'Udemy Instructor',
          url: link.url,
          isTrending: false,
          tags: searchQuery,
          avgMonthlyEnroll: 0,
          demandScore: 0,
          supplyScore: 0,
        })
      }
    }

    await page.close()
  } catch (error: any) {
    console.error(`[Udemy Scraper] "${categorySlug}" hatasi: ${error?.message || error}`)
  }

  return courses
}

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

export async function fetchAllUdemyCategories(
  categorySlugs: string[]
): Promise<Map<string, UdemyCategoryData>> {
  const results = new Map<string, UdemyCategoryData>()

  // Sequential - browser tek, rate limiting icin
  for (const slug of categorySlugs) {
    const data = await fetchUdemyCategory(slug)
    if (data && data.courses.length > 0) {
      results.set(slug, data)
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  await closeBrowser()

  return results
}
