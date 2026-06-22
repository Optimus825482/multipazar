import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    const where = platform ? { platform } : undefined

    const categories = await db.category.findMany({
      where,
      orderBy: { totalRevenue: 'desc' },
      include: {
        products: {
          orderBy: { revenue: 'desc' },
          take: 5,
        },
      },
    })

    // Sifira bolme guard'i: totalRevenue 0 ise pay 0 kabul edilir
    const totalRevenue = categories.reduce((sum, c) => sum + c.totalRevenue, 0)

    const categoriesWithStats = categories.map((c) => ({
      ...c,
      revenueShare: totalRevenue > 0 ? Math.round((c.totalRevenue / totalRevenue) * 100 * 10) / 10 : 0,
      productCount: c.products.length,
    }))

    return NextResponse.json(categoriesWithStats)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
