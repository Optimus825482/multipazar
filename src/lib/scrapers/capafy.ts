import axios from 'axios'
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

const CAPAFY_BASE = 'https://capafy.com'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/**
 * Capafy kategori sayfasindan urun verilerini ceker
 */
async function scrapeCapafyCategory(categorySlug: string): Promise<CapafyProduct[]> {
  const products: CapafyProduct[] = []

  try {
    // Capafy'nin kategori sayfasina git
    const url = `${CAPAFY_BASE}/category/${categorySlug}`
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(response.data)

    // Capafy urun kartlarini parse et
    $('[data-testid="product-card"], .product-card, article, .card').each((_, el) => {
      const name = $(el).find('[data-testid="product-title"], h2, h3, .title').first().text().trim()
      const priceText = $(el).find('[data-testid="product-price"], .price, [class*="price"]').first().text().trim()
      const ratingText = $(el).find('[data-testid="rating"], .rating, [class*="rating"]').first().text().trim()
      const reviewsText = $(el).find('[data-testid="reviews"], .reviews, [class*="reviews"]').first().text().trim()
      const creatorText = $(el).find('[data-testid="creator"], .creator, [class*="creator"], .author').first().text().trim()
      const salesText = $(el).find('[data-testid="sales"], .sales, [class*="sales"]').first().text().trim()
      const urlPath = $(el).find('a').first().attr('href') || ''

      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0
      const rating = parseFloat(ratingText) || 0
      const reviewCount = parseInt(reviewsText.replace(/[^0-9]/g, '')) || 0
      const salesCount = parseInt(salesText.replace(/[^0-9]/g, '')) || 0

      if (name && price > 0) {
        products.push({
          name,
          price,
          rating,
          reviewCount,
          salesCount,
          creator: creatorText || 'Unknown Creator',
          url: urlPath.startsWith('http') ? urlPath : `${CAPAFY_BASE}${urlPath}`,
          isTrending: false,
          tags: categorySlug,
          avgMonthlySales: salesCount > 0 ? Math.round(salesCount / 3) : 0,
          demandScore: 0,
          supplyScore: 0,
        })
      }
    })

    // JSON-LD verisi varsa onu da dene
    if (products.length === 0) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}')
          const items = json['@graph'] || json['itemListElement'] || [json]
          for (const item of items) {
            if (item['@type'] === 'Product' || item['@type'] === 'ListItem') {
              const product = item['item'] || item
              const name = product.name || ''
              const price = parseFloat(product?.offers?.price || '0')
              const rating = product?.aggregateRating?.ratingValue || 0
              const reviewCount = product?.aggregateRating?.reviewCount || 0

              if (name && price > 0) {
                products.push({
                  name,
                  price,
                  rating: parseFloat(rating),
                  reviewCount: parseInt(reviewCount),
                  salesCount: 0,
                  creator: product.brand?.name || product.author?.name || 'Unknown',
                  url: product.url || '',
                  isTrending: false,
                  tags: categorySlug,
                  avgMonthlySales: 0,
                  demandScore: 0,
                  supplyScore: 0,
                })
              }
            }
          }
        } catch {}
      })
    }

    // API endpoint'ini dene (eğer varsa)
    if (products.length === 0) {
      try {
        const apiUrl = `${CAPAFY_BASE}/api/products?category=${categorySlug}&limit=20`
        const apiResponse = await axios.get(apiUrl, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'application/json',
          },
          timeout: 10000,
        })

        if (apiResponse.data?.products || apiResponse.data?.data) {
          const items = apiResponse.data.products || apiResponse.data.data || []
          for (const item of items) {
            products.push({
              name: item.name || item.title || '',
              price: parseFloat(item.price || '0'),
              rating: item.rating || item.averageRating || 0,
              reviewCount: item.reviewCount || item.numReviews || 0,
              salesCount: item.sales || item.salesCount || 0,
              creator: item.creator || item.author || item.seller || 'Unknown',
              url: item.url || item.link || '',
              isTrending: item.isTrending || item.trending || false,
              tags: categorySlug,
              avgMonthlySales: item.avgMonthlySales || 0,
              demandScore: 0,
              supplyScore: 0,
            })
          }
        }
      } catch {}
    }
  } catch (error) {
    console.error(`[Capafy Scraper] "${categorySlug}" hatasi:`, error instanceof Error ? error.message : error)
  }

  return products
}

/**
 * Bir Capafy kategorisini ceker ve analiz eder
 */
export async function fetchCapafyCategory(categorySlug: string): Promise<CapafyCategoryData | null> {
  const products = await scrapeCapafyCategory(categorySlug)

  if (products.length === 0) {
    return null
  }

  const totalProducts = products.length
  const avgPrice = Math.round(products.reduce((s, p) => s + p.price, 0) / totalProducts)
  const avgRating = Math.round(products.reduce((s, p) => s + p.rating, 0) / totalProducts * 10) / 10
  const avgReviews = Math.round(products.reduce((s, p) => s + p.reviewCount, 0) / totalProducts)

  return {
    name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    slug: categorySlug,
    totalProducts,
    avgPrice,
    avgRating,
    avgReviews,
    products,
  }
}

/**
 * Tum Capafy kategorilerini ceker
 */
export async function fetchAllCapafyCategories(
  categorySlugs: string[]
): Promise<Map<string, CapafyCategoryData>> {
  const results = new Map<string, CapafyCategoryData>()

  for (const slug of categorySlugs) {
    const data = await fetchCapafyCategory(slug)
    if (data && data.products.length > 0) {
      results.set(slug, data)
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  return results
}
