/**
 * Helper fonksiyonlar - veri tabanli bicimlendirme ve hesaplama yardimcilari.
 *
 * GUVENLIK/KALITE:
 * - Sifira bolme ve NaN guard'lari
 * - Para ile adet/olcu arasinda net ayrim (formatCurrency vs formatCount)
 * - Hesaplama yardimcilari scoring.ts ile tek kaynakta (DRY)
 */

import { db } from '@/lib/db'
import { calculateOpportunityScore as calcOpp } from '@/lib/scrapers/scoring'

export function formatCurrency(n: number): string {
  const safe = safeNum(n)
  if (safe >= 1_000_000_000) return `$${(safe / 1_000_000_000).toFixed(1)}B`
  if (safe >= 1_000_000) return `$${(safe / 1_000_000).toFixed(1)}M`
  if (safe >= 1_000) return `$${(safe / 1_000).toFixed(1)}K`
  return `$${safe.toLocaleString()}`
}

/**
 * @deprecated formatNumber eski kullanimlar icin birakildi; para icin formatCurrency,
 * adet/olcu icin formatCount kullanin.
 */
export const formatNumber = formatCurrency

export function formatCount(n: number): string {
  const safe = safeNum(n)
  if (safe >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(1)}B`
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}K`
  return safe.toLocaleString()
}

/**
 * Bir degerin guvenli sayi karsiligini doner.
 * NaN, Infinity, null, undefined, hatali tipler -> fallback.
 */
export function safeNum(n: unknown, fallback: number = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/**
 * Guvenli bolme. Sifira bolmeyi onler.
 */
export function safeDivide(a: number, b: number, fallback: number = 0): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return fallback
  return a / b
}

/**
 * Guvenli ortalama. Bos dizi -> fallback.
 */
export function safeAverage(values: number[], fallback: number = 0): number {
  const valid = values.filter((v) => Number.isFinite(v))
  if (valid.length === 0) return fallback
  return valid.reduce((s, v) => s + v, 0) / valid.length
}

export function getProductCount(c: { totalProducts?: number; totalCourses?: number }): number {
  return safeNum(c?.totalProducts ?? c?.totalCourses)
}

export function getOverviewCount(overview: { totalProducts?: number; totalCourses?: number } | null | undefined): number {
  return safeNum(overview?.totalProducts ?? overview?.totalCourses)
}

/**
 * Opportunity score - scoring.ts ile tek kaynaktan.
 * (Eski duplikat calcOpportunityScore kaldirildi.)
 */
export function calcOpportunityScore(demandScore: number, supplyScore: number): number {
  return calcOpp(safeNum(demandScore), safeNum(supplyScore))
}

export function sortTopCategories(categories: Record<string, unknown>[], field: string, limit: number = 5) {
  return [...categories]
    .sort((a, b) => {
      const aVal = safeNum(a[field])
      const bVal = safeNum(b[field])
      return field === 'competitionIndex' ? aVal - bVal : bVal - aVal
    })
    .slice(0, limit)
}

export function sortTopProducts(products: Record<string, unknown>[], field: string, limit: number = 10) {
  return [...products]
    .sort((a, b) => safeNum(b[field]) - safeNum(a[field]))
    .slice(0, limit)
}

export function calcGapScore(demandScore: number, supplyScore: number): number {
  return Math.round((safeNum(demandScore) - safeNum(supplyScore)) * 10) / 10
}

export function enrichProductWithRevenue(p: Record<string, unknown>): Record<string, unknown> {
  const price = safeNum(p.price)
  const count = safeNum(p.salesCount ?? p.studentCount)
  const calculatedRevenue = Math.round(price * count)
  return {
    ...p,
    revenue: safeNum(p.revenue) || calculatedRevenue,
    opportunityScore: calcOpportunityScore(safeNum(p.demandScore), safeNum(p.supplyScore)),
  }
}

interface TrendRow {
  keyword: string
  month: string
  volume: number
}

export async function getPlatformDataFromDB(platform: string): Promise<{
  categories: Record<string, unknown>[]
  products: Record<string, unknown>[]
  insights: Record<string, unknown>[]
  trends: TrendRow[]
  productIdeas: Record<string, unknown>[]
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
    categories: dbCategories as unknown as Record<string, unknown>[],
    products: dbProducts as unknown as Record<string, unknown>[],
    insights: dbInsights as unknown as Record<string, unknown>[],
    trends: dbTrends.map((t) => ({
      keyword: t.keyword,
      month: t.month,
      volume: t.volume,
    })),
    productIdeas: dbProductIdeas as unknown as Record<string, unknown>[],
  }
}

export function buildTrendDataFromDB(dbTrends: TrendRow[]): { keyword: string; data: { month: string; volume: number }[]; growthRate: number; avgVolume: number }[] {
  // Bos ise erken don - sifira bolme/NaN onlenir
  if (!dbTrends || dbTrends.length === 0) return []

  const grouped: Record<string, { keyword: string; data: { month: string; volume: number }[] }> = {}
  for (const t of dbTrends) {
    if (!grouped[t.keyword]) {
      grouped[t.keyword] = { keyword: t.keyword, data: [] }
    }
    grouped[t.keyword].data.push({ month: t.month, volume: t.volume })
  }
  return Object.values(grouped).map((g) => {
    const volumes = g.data.map((d) => d.volume)
    const avgVolume = Math.round(safeAverage(volumes))
    // Sifira bolmeyi onle: ilk deger 0 ise 1 kullan
    const firstVal = volumes[0] || 1
    const lastVal = volumes[volumes.length - 1] || 1
    const growthRate = Math.round(((lastVal - firstVal) / firstVal) * 100)
    return { keyword: g.keyword, data: g.data, growthRate, avgVolume }
  })
}
