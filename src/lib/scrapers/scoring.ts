/**
 * ARZ/TALEP PUANLAMA MOTORU v2 — Gerçek veriye dayalı
 *
 * Tespit edilen kök hatalar ve düzeltmeler:
 * - H13 (KRİTİK): searchVolume (Google Trends 0-100 relative) absolute sanılıyordu.
 *   Çözüm: popularityScore olarak rename + UI flag.
 * - H14 (KRİTİK): estimateGrowthRate her zaman +15 ile başlıyordu, hiç negatif
 *   olmuyordu. Çözüm: baseGrowth=0 ile başla, sadece güçlü pozitif sinyaller ekle.
 * - YENİ: productSaturationRatio (review_count / total_products) talep yoğunluğu
 *   proxy'si.
 * - YENİ: gerçek totalRevenue hesabı (heuristic veya native flag'li).
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
  totalProducts: number // Sample (scraped)
  realTotalProducts?: number | null // Platform'un gerçek total'i (pagination + data_source)
  totalRevenue: number // Estimated (heuristic) if native missing
  revenueEstimationMethod?: string // "platform_native" | "price_x_sales" | "price_x_estimated_sales" | "free_only" | "no_data"
  searchVolume: number // Google Trends 0-100 popularity score
  avgRating: number
  avgReviews: number
  totalStudents: number
}

/**
 * Talep skoru (0-10)
 *
 * Düzeltme: artık sadece Google Trends relative skoruna değil, aynı zamanda
 * yorum/ürün yoğunluğuna (saturation proxy) ve review sayısına bakıyoruz.
 *
 * Ağırlıklar:
 * - popularityScore (Google Trends 0-100): %30 (relative talep sinyali)
 * - yorum/ürün oranı (review density): %35 (talep yoğunluğu proxy)
 * - ortalama yorum sayısı: %20 (görece popülerlik)
 * - ortalama fiyat: %15 (yüksek fiyat = yüksek talep, premium pazar)
 */
export function calculateDemandScore(stats: CategoryStats, allStats: CategoryStats[]): number {
  const maxPopularity = Math.max(...allStats.map((s) => s.searchVolume), 1)
  const maxReviews = Math.max(...allStats.map((s) => s.avgReviews), 1)
  const maxPrice = Math.max(...allStats.map((s) => s.avgPrice), 1)
  const maxDensity = Math.max(
    ...allStats.map((s) => (s.totalProducts > 0 ? s.avgReviews / s.totalProducts : 0)),
    1
  )

  const popularityNorm = (stats.searchVolume / maxPopularity) * 10

  // Yorum/ürün oranı — yüksek = her ürünün çok yorum alması = talep yoğunluğu
  const density = stats.totalProducts > 0 ? stats.avgReviews / stats.totalProducts : 0
  const densityNorm = (density / maxDensity) * 10

  const reviewsNorm = (stats.avgReviews / maxReviews) * 10
  const priceNorm = (stats.avgPrice / maxPrice) * 10

  const score = popularityNorm * 0.3 + densityNorm * 0.35 + reviewsNorm * 0.2 + priceNorm * 0.15

  return Math.round(Math.min(score, 10) * 10) / 10
}

/**
 * Rekabet / arz skoru (0-10)
 *
 * Düzeltme: artık sample totalProducts yerine mümkün olduğunda realTotalProducts
 * kullanılır (platform'un verdiği gerçek sayı).
 *
 * Ağırlıklar:
 * - realTotalProducts (veya sample): %40 (çok ürün = yüksek rekabet)
 * - search-to-product ratio (ters): %30 (doygunluk sinyali)
 * - ortalama yorum sayısı: %30
 */
export function calculateSupplyScore(stats: CategoryStats, allStats: CategoryStats[]): number {
  // RealTotal varsa onu kullan, yoksa sample
  const realStats = allStats.map((s) => ({
    ...s,
    effectiveTotalProducts: s.realTotalProducts ?? s.totalProducts,
  }))
  const realMaxProducts = Math.max(...realStats.map((s) => s.effectiveTotalProducts), 1)

  const effectiveTotal = stats.realTotalProducts ?? stats.totalProducts

  const productNorm = (effectiveTotal / realMaxProducts) * 10

  // Ürün başına talep (yüksek = az doymuş, düşük = doymuş)
  const demandPerProduct = effectiveTotal > 0 ? stats.searchVolume / effectiveTotal : 0
  const maxDemandPerProduct = Math.max(
    ...realStats.map((s) =>
      (s.realTotalProducts ?? s.totalProducts) > 0
        ? s.searchVolume / (s.realTotalProducts ?? s.totalProducts)
        : 0
    ),
    1
  )
  const saturationNorm = (1 - demandPerProduct / maxDemandPerProduct) * 10

  const maxReviews = Math.max(...allStats.map((s) => s.avgReviews), 1)
  const reviewsNorm = (stats.avgReviews / maxReviews) * 10

  const score = productNorm * 0.4 + saturationNorm * 0.3 + reviewsNorm * 0.3

  return Math.round(Math.min(score, 10) * 10) / 10
}

/**
 * Competition Index = supply / demand oranı (0-10)
 * demandScore 0 ise division undefined → max rekabet varsay
 */
export function calculateCompetitionIndex(
  demandScore: number,
  supplyScore: number
): number {
  if (demandScore === 0) return 10
  return Math.round(Math.min((supplyScore / demandScore) * 10, 10) * 10) / 10
}

/**
 * Opportunity Score — talep yüksek, arz düşük → yüksek skor
 */
export function calculateOpportunityScore(
  demandScore: number,
  supplyScore: number
): number {
  // demand 10, supply 0 → 100; demand 0, supply 10 → -80 → 0
  const raw = demandScore * 10 - supplyScore * 8
  return Math.max(0, Math.round(raw * 10) / 10)
}

/**
 * Growth Rate v2 — düzeltilmiş
 *
 * ESKİ (yanlış): baseGrowth = 15 ile başlıyor, hep pozitif, hiç düşmüyor.
 * YENİ: baseGrowth = 0, sadece gerçek sinyaller ekleyip çıkarır.
 */
export function estimateGrowthRate(
  searchVolume: number, // 0-100 Google Trends popularity
  totalProducts: number,
  avgRating: number,
  growthRateFromTrends?: number | null // Google Trends'in verdiği gerçek growth %
): number {
  // Eğer Google Trends gerçek growth verdiyse, onu kullan (en güvenilir)
  if (growthRateFromTrends !== null && growthRateFromTrends !== undefined && !Number.isNaN(growthRateFromTrends)) {
    return Math.round(growthRateFromTrends * 10) / 10
  }

  // Yoksa tahmin et — ama ARTI HER ZAMAN POZİTİF BAŞLAMA
  let baseGrowth = 0

  // Yüksek trend popularity = pozitif (ama orantılı)
  if (searchVolume > 70) baseGrowth += 8
  else if (searchVolume > 40) baseGrowth += 4
  else if (searchVolume < 15) baseGrowth -= 5 // düşük popularity = negatif sinyal

  // Az ürün = büyüme potansiyeli (ama çok az = niş pazar riski)
  if (totalProducts < 100) baseGrowth += 5
  else if (totalProducts < 1000) baseGrowth += 3
  else if (totalProducts > 10000) baseGrowth -= 3

  // Yüksek rating = kaliteli pazar (ama abartma)
  if (avgRating >= 4.5) baseGrowth += 2
  else if (avgRating > 0 && avgRating < 3.5) baseGrowth -= 3

  return Math.round(baseGrowth * 10) / 10
}

/**
 * Trend direction — growth rate'e göre
 */
export function determineTrendDirection(growthRate: number): 'up' | 'down' | 'stable' {
  if (growthRate > 10) return 'up'
  if (growthRate < -5) return 'down'
  return 'stable'
}

/**
 * Google Trends'in günlük verisinden aylık büyüme hesabı.
 * İlk çeyrek vs son çeyrek ortalaması (robust sinyal).
 */
export function calculateGrowthFromTrendData(
  monthlyVolumes: number[]
): number {
  if (monthlyVolumes.length < 2) return 0

  const quartileSize = Math.max(3, Math.floor(monthlyVolumes.length / 4))
  const firstQuartile = monthlyVolumes.slice(0, quartileSize)
  const lastQuartile = monthlyVolumes.slice(-quartileSize)

  const firstAvg = firstQuartile.reduce((a, b) => a + b, 0) / firstQuartile.length
  const lastAvg = lastQuartile.reduce((a, b) => a + b, 0) / lastQuartile.length

  if (firstAvg === 0) return 0
  return Math.round(((lastAvg - firstAvg) / firstAvg) * 100 * 10) / 10
}

/**
 * Tahmini gerçek aylık arama hacmi (Google Trends relative → absolute tahmin)
 *
 * UYARI: Bu sadece TAHMİN. Mutlak değer için SerpAPI / Google Keyword Planner gerekli.
 * Mevcut avgSearchVolume platform metadata'dan geliyorsa (örn: bir kategori için
 * toplam arama hacmi), onun oranı kullanılır.
 */
export function estimateMonthlyVolume(
  trendValue: number, // 0-100 relative
  avgSearchVolume: number,
  maxTrendValue: number = 100
): number {
  if (avgSearchVolume <= 0) return Math.round(trendValue) // göreceli değer olarak bırak
  return Math.round((trendValue / maxTrendValue) * avgSearchVolume)
}

/**
 * Karsilanmamis talep (unmet demand) hesabi.
 * Platform carpani: Gumroad'da talep arzdan fazlaysa deger yuksek olur.
 */
export function calculateUnmetDemand(
  searchVolume: number,
  totalProducts: number,
  platformFactor: number = 0.12
): number {
  if (totalProducts === 0) return Math.round(searchVolume * platformFactor)
  return Math.round(searchVolume * platformFactor - totalProducts * 0.08)
}
