import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { totalRevenue: 'desc' },
      include: {
        products: {
          orderBy: { revenue: 'desc' },
          take: 5,
        },
      },
    })

    const totalRevenue = categories.reduce((sum, c) => sum + c.totalRevenue, 0)

    const categoriesWithStats = categories.map((c) => ({
      ...c,
      revenueShare: Math.round((c.totalRevenue / totalRevenue) * 100 * 10) / 10,
      productCount: c.products.length,
    }))

    return NextResponse.json(categoriesWithStats)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
