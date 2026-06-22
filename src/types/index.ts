export interface Category {
  id?: string
  slug: string
  name: string
  description?: string
  icon?: string
  color: string
  avgPrice: number
  totalProducts: number
  totalRevenue: number
  searchVolume: number
  demandScore: number
  supplyScore: number
  competitionIndex: number
  growthRate: number
  trendDirection: string
  source?: string
  avgRating?: number
  avgReviews?: number
  products?: Product[]
  revenueShare?: number
  gapScore?: number
  estimatedMonthlyDemand?: number
  estimatedMonthlySupply?: number
  unmetDemand?: number
}

export interface Product {
  id?: string
  slug?: string
  name: string
  price: number
  salesCount: number
  studentCount?: number
  revenue: number
  rating: number
  reviewCount: number
  searchVolume?: number
  demandScore: number
  supplyScore: number
  opportunityScore: number
  tags: string
  type?: string
  avgMonthlySales?: number
  avgMonthlyEnroll?: number
  priceRange?: string
  isTrending: boolean
  category?: Category
  instructor?: string
  creator?: string
  url?: string
}

export interface Insight {
  id?: string
  title: string
  description: string
  insightType: string
  impactScore: number
  source?: string
}

export interface TrendData {
  keyword: string
  data: { month: string; volume: number }[]
  growthRate: number
  avgVolume: number
}

export interface ProductIdea {
  name: string
  category: string
  estimatedPrice: number
  estimatedMonthlySales: number
  estimatedMonthlyEnroll?: number
  estimatedMonthlyRevenue: number
  demandScore: number
  supplyScore: number
  gapScore: number
  difficulty: string
  timeToCreate: string
  reason: string
  sourceUrl?: string
}

export interface PlatformData {
  overview: any
  categories: Category[]
  topProducts: Product[]
  trendingProducts: Product[]
  products: Product[]
  opportunities: any
  insights: Insight[]
  trends: TrendData[]
  topCategories: Category[]
  fastestGrowing: Category[]
  lowestCompetition: Category[]
  lastUpdated?: string
}

export interface CompareData {
  platforms: any[]
  crossMarketOpportunities: any[]
  comparisonMetrics: any[]
  platformStrengths: any[]
  lastUpdated?: string
}