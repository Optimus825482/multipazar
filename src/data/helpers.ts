import { Product, Category, TrendData } from './types'

export function formatNumber(n: number): string {
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export function formatCount(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toLocaleString()
}

export function safeNum(n: any, fallback: number = 0): number {
  return typeof n === 'number' && isFinite(n) ? n : fallback
}

export function getProductCount(c: any): number {
  return safeNum(c.totalProducts || c.totalCourses)
}

export function getOverviewCount(overview: any): number {
  return safeNum(overview?.totalProducts || overview?.totalCourses)
}

export function calcOpportunityScore(demandScore: number, supplyScore: number): number {
  return Math.max(0, Math.round((demandScore * 10 - supplyScore * 8) * 10) / 10)
}

export function generateTrendData(
  slug: string,
  growthRate: number,
  avgVolume: number,
  months: number = 12
): { month: string; volume: number }[] {
  return Array.from({ length: months }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, '0')}`,
    volume: Math.round(avgVolume * Math.pow(1 + growthRate / 1200, i) * (0.9 + Math.random() * 0.2)),
  }))
}

export function sortTopCategories(categories: any[], field: string, limit: number = 5) {
  return [...categories]
    .sort((a: any, b: any) => {
      const aVal = safeNum(a[field])
      const bVal = safeNum(b[field])
      return field === 'competitionIndex' ? aVal - bVal : bVal - aVal
    })
    .slice(0, limit)
}

export function sortTopProducts(products: any[], field: string, limit: number = 10) {
  return [...products]
    .sort((a: any, b: any) => safeNum(b[field]) - safeNum(a[field]))
    .slice(0, limit)
}

export function calcGapScore(demandScore: number, supplyScore: number): number {
  return Math.round((demandScore - supplyScore) * 10) / 10
}

import { db } from '@/lib/db'

export function enrichProductWithRevenue(p: any): any {
  const calculatedRevenue = Math.round(p.price * (p.salesCount || p.studentCount || 0))
  return {
    ...p,
    revenue: p.revenue || calculatedRevenue,
    opportunityScore: calcOpportunityScore(p.demandScore, p.supplyScore),
  }
}

export async function getPlatformDataFromDB(platform: string): Promise<{
  categories: any[]
  products: any[]
  insights: any[]
  trends: any[]
  productIdeas: any[]
}> {
  const [dbCategories, dbProducts, dbInsights, dbTrends, dbProductIdeas] = await Promise.all([
    db.category.findMany({ where: { platform }, orderBy: { totalRevenue: 'desc' } }),
    db.product.findMany({
      where: { platform },
      include: { category: true },
      orderBy: { revenue: 'desc' },
    }),
    db.marketInsight.findMany({ where: { platform }, orderBy: { impactScore: 'desc' } }),
    db.searchTrend.findMany({ where: { platform }, orderBy: [{ keyword: 'asc' }, { month: 'asc' }] }),
    db.productIdea.findMany({ where: { platform } }),
  ])

  return {
    categories: dbCategories,
    products: dbProducts,
    insights: dbInsights,
    trends: dbTrends,
    productIdeas: dbProductIdeas,
  }
}

export function buildTrendDataFromDB(dbTrends: any[]): TrendData[] {
  const grouped: Record<string, { keyword: string; data: { month: string; volume: number }[] }> = {}
  for (const t of dbTrends) {
    if (!grouped[t.keyword]) {
      grouped[t.keyword] = { keyword: t.keyword, data: [] }
    }
    grouped[t.keyword].data.push({ month: t.month, volume: t.volume })
  }
  return Object.values(grouped).map((g) => {
    const volumes = g.data.map((d) => d.volume)
    const avgVolume = Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
    const firstVal = volumes[0] || 1
    const lastVal = volumes[volumes.length - 1] || 1
    const growthRate = Math.round(((lastVal - firstVal) / firstVal) * 100)
    return { keyword: g.keyword, data: g.data, growthRate, avgVolume }
  })
}
