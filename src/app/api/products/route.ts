import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categorySlug = searchParams.get('category')
    const sort = searchParams.get('sort') || 'revenue'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (categorySlug) {
      const category = await db.category.findFirst({ where: { slug: categorySlug } })
      if (category) where.categoryId = category.id
    }

    const orderBy: Record<string, string> = {}
    switch (sort) {
      case 'revenue': orderBy.revenue = 'desc'; break
      case 'sales': orderBy.salesCount = 'desc'; break
      case 'price': orderBy.price = 'desc'; break
      case 'demand': orderBy.demandScore = 'desc'; break
      case 'opportunity': orderBy.opportunityScore = 'desc'; break
      case 'trending': orderBy.opportunityScore = 'desc'; break
      default: orderBy.revenue = 'desc'
    }

    let products = await db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    })

    if (sort === 'trending') {
      products = products.filter((p) => p.isTrending)
    }

    const total = await db.product.count({ where })

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
