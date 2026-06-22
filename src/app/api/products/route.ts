import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

/**
 * Urun listesi sorgu parametreleri - input dogrulamasi.
 *
 * GUVENLIK: Tum kullanici girisi zod ile dogrulanir.
 * Gecersiz/degisik tipler 400 doner, uygulama katmanina ulasmaz.
 */
const SortEnum = z.enum(['revenue', 'sales', 'price', 'demand', 'opportunity', 'trending'])
const PlatformEnum = z.enum(['gumroad', 'udemy', 'capafy']).optional()

const ProductsQuerySchema = z.object({
  category: z.string().trim().min(1).max(100).optional(),
  platform: PlatformEnum,
  sort: SortEnum.default('revenue'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawParams = Object.fromEntries(searchParams.entries())

    // Input dogrulama
    const parsed = ProductsQuerySchema.safeParse(rawParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz sorgu parametreleri', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { category: categorySlug, platform, sort, page, limit, minPrice, maxPrice } = parsed.data

    // where kosulu olustur
    const where: Record<string, unknown> = {}
    if (platform) where.platform = platform
    if (categorySlug) {
      const category = await db.category.findFirst({ where: { slug: categorySlug } })
      if (category) where.categoryId = category.id
    }
    // Fiyat araligi filtresi
    const priceFilter: Record<string, number> = {}
    if (typeof minPrice === 'number') priceFilter.gte = minPrice
    if (typeof maxPrice === 'number') priceFilter.lte = maxPrice
    if (Object.keys(priceFilter).length > 0) where.price = priceFilter

    // SORT BUG FIX: 'trending' filtresi once where kosuluna tasinmali,
    // sayfalama (skip/take) SONRA uygulanmali. Eski kod once 20 urun alip
    // sonra icinden trending olanlari filtreliyordu -> yanlis/eksik sonuc.
    const isTrendingSort = sort === 'trending'

    // orderBy - trending siralamasi opportunityScore ile yapilir
    const orderByField = isTrendingSort ? 'opportunityScore' : sort
    const orderBy: Record<string, string> = { [orderByField]: 'desc' }

    // Trending filtresini where'e tasi (sayfalamadan once)
    if (isTrendingSort) {
      where.isTrending = true
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
      db.product.count({ where }),
    ])

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
