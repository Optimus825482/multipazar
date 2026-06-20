/**
 * ARZ/TALEP PUANLAMA MOTORU
 * 
 * Gerçek verilerden demandScore, supplyScore, competitionIndex,
 * opportunityScore hesaplar. Tum degerler 0-10 arasinda normalize edilir.
 */

export interface ScoredItem<T> {
  item: T
  demandScore: number
  supplyScore: number
  competitionIndex: number
  opportunityScore: number
  growthRate: number
}

export interface CategoryStats {
  avgPrice: number
  totalProducts: number
  totalRevenue: number
  searchVolume: number
  avgRating: number
  avgReviews: number
  totalStudents: number
}

/**
 * Kategoriler arasi normalize edilmis demandScore hesaplar
 * 
 * Faktorler:
 * - Google Trends arama hacmi (%40)
 * - Toplam urun sayisi (%20 - yuksek urun = yuksek talep)
 * - Ortalama puan (%15)
 * - Ortalama fiyat (%15 - yuksek fiyat = yuksek talep)
 * - Yorum sayisi (%10)
 */
export function calculateDemandScore(stats: CategoryStats, allStats: CategoryStats[]): number {
  const maxSearchVolume = Math.max(...allStats.map((s) => s.searchVolume), 1)
  const maxProducts = Math.max(...allStats.map((s) => s.totalProducts), 1)
  const maxRating = Math.max(...allStats.map((s) => s.avgRating), 1)
  const maxPrice = Math.max(...allStats.map((s) => s.avgPrice), 1)
  const maxReviews = Math.max(...allStats.map((s) => s.avgReviews), 1)

  // Her metrigi 0-10 arasinda normalize et
  const searchNorm = (stats.searchVolume / maxSearchVolume) * 10
  const productNorm = (stats.totalProducts / maxProducts) * 10
  const ratingNorm = (stats.avgRating / maxRating) * 10
  const priceNorm = (stats.avgPrice / maxPrice) * 10
  const reviewsNorm = (stats.avgReviews / maxReviews) * 10

  // Agirlikli ortalama
  const score =
    searchNorm * 0.4 +
    productNorm * 0.2 +
    ratingNorm * 0.15 +
    priceNorm * 0.15 +
    reviewsNorm * 0.1

  return Math.round(Math.min(score, 10) * 10) / 10
}

/**
 * Rekabet / arz skoru hesaplar
 * 
 * Faktorler:
 * - Urun sayisi (%40 - cok urun = yuksek rekabet)
 * - Arama hacmi basina urun sayisi (%30)
 * - Ortalama yorum sayisi (%30 - cok yorum = doymus pazar)
 */
export function calculateSupplyScore(stats: CategoryStats, allStats: CategoryStats[]): number {
  const maxProducts = Math.max(...allStats.map((s) => s.totalProducts), 1)
  const maxReviews = Math.max(...allStats.map((s) => s.avgReviews), 1)

  // Urun basina arama hacmi (dusuk = doymus)
  const searchPerProduct = stats.totalProducts > 0 ? stats.searchVolume / stats.totalProducts : 0
  const maxSearchPerProduct = Math.max(
    ...allStats.map((s) => (s.totalProducts > 0 ? s.searchVolume / s.totalProducts : 0)),
    1
  )

  const productNorm = (stats.totalProducts / maxProducts) * 10
  const saturationNorm = (1 - searchPerProduct / maxSearchPerProduct) * 10
  const reviewsNorm = (stats.avgReviews / maxReviews) * 10

  const score = productNorm * 0.4 + saturationNorm * 0.3 + reviewsNorm * 0.3

  return Math.round(Math.min(score, 10) * 10) / 10
}

/**
 * Competition Index = supply / demand orani (0-10)
 */
export function calculateCompetitionIndex(
  demandScore: number,
  supplyScore: number
): number {
  if (demandScore === 0) return 10
  return Math.round(Math.min((supplyScore / demandScore) * 10, 10) * 10) / 10
}

/**
 * Opportunity Score = demand - supply (0-10 arasi normalize)
 */
export function calculateOpportunityScore(
  demandScore: number,
  supplyScore: number
): number {
  return Math.max(0, Math.round((demandScore * 10 - supplyScore * 8) * 10) / 10)
}

/**
 * Growth Rate: Google Trends verisinden veya varsayilan olarak
 * arama hacmi ve urun artisindan hesaplanir
 */
export function estimateGrowthRate(
  searchVolume: number,
  totalProducts: number,
  avgRating: number
): number {
  // Sektor ortalamasi baz alinir
  let baseGrowth = 15.0 // varsayilan minimum buyume

  // Yuksek talep = yuksek buyume
  if (searchVolume > 500000) baseGrowth += 15
  else if (searchVolume > 100000) baseGrowth += 10
  else if (searchVolume > 50000) baseGrowth += 5

  // Dusuk urun sayisi = buyume potansiyeli
  if (totalProducts < 500) baseGrowth += 10
  else if (totalProducts < 2000) baseGrowth += 5
  else if (totalProducts > 10000) baseGrowth -= 5

  // Yuksek puan = kaliteli pazar = pozitif buyume
  if (avgRating > 4.5) baseGrowth += 3
  else if (avgRating < 4.0) baseGrowth -= 2

  return Math.round(baseGrowth * 10) / 10
}

/**
 * Trend direction belirler
 */
export function determineTrendDirection(growthRate: number): 'up' | 'down' | 'stable' {
  if (growthRate > 10) return 'up'
  if (growthRate < -5) return 'down'
  return 'stable'
}

/**
 * Google Trends verisinden buyume orani hesaplar
 */
export function calculateGrowthFromTrendData(
  monthlyVolumes: number[]
): number {
  if (monthlyVolumes.length < 2) return 0

  // Ilk 3 ay vs son 3 ay karsilastirmasi
  const firstQuartile = monthlyVolumes.slice(0, Math.max(3, Math.floor(monthlyVolumes.length / 4)))
  const lastQuartile = monthlyVolumes.slice(-Math.max(3, Math.floor(monthlyVolumes.length / 4)))

  const firstAvg = firstQuartile.reduce((a, b) => a + b, 0) / firstQuartile.length
  const lastAvg = lastQuartile.reduce((a, b) => a + b, 0) / lastQuartile.length

  if (firstAvg === 0) return 0
  return Math.round(((lastAvg - firstAvg) / firstAvg) * 100 * 10) / 10
}

/**
 * Google Trends verisinden gercek aylik arama hacmi tahmini
 * Trends 0-100 skalasinda deger verir, absolute volume degil
 * Bu fonksiyon relative veriyi absolute hacme cevirir
 */
export function estimateMonthlyVolume(
  trendValue: number,
  avgSearchVolume: number,
  maxTrendValue: number = 100
): number {
  return Math.round((trendValue / maxTrendValue) * avgSearchVolume)
}

/**
 * Unmet demand (karsilanmamis talep) hesaplar
 */
export function calculateUnmetDemand(
  searchVolume: number,
  totalProducts: number,
  platformFactor: number = 0.12
): number {
  return Math.round(searchVolume * platformFactor - totalProducts * 0.08)
}
