// ===== Veri Tipleri =====

export interface Category {
  id?: string
  platform?: string
  slug: string
  name: string
  description?: string
  icon?: string
  color: string
  avgPrice: number
  totalProducts: number
  totalRevenue: number
  totalStudents?: number
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
  productCount?: number
  gapScore?: number
  estimatedMonthlyDemand?: number
  estimatedMonthlySupply?: number
  unmetDemand?: number
}

export interface Product {
  id?: string
  platform?: string
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
  seller?: string
  url?: string
  gumroadUrl?: string
}

export interface Insight {
  id?: string
  platform?: string
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
  platform?: string
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

export interface PlatformOverview {
  totalRevenue: number
  totalProducts: number
  totalSearchVolume: number
  avgGrowthRate: number
  totalCategories: number
  avgPrice?: number
  totalStudents?: number
  dataSources?: { name: string; desc: string; url: string }[]
}

export interface PlatformData {
  overview: PlatformOverview
  categories: Category[]
  topProducts: Product[]
  trendingProducts: Product[]
  products: Product[]
  opportunities: {
    categories?: Category[]
    productIdeas: ProductIdea[]
    summary: {
      totalOpportunities: number
      avgGapScore: number
      topCategoryGaps: { name: string; gap: number }[]
    }
  }
  insights: Insight[]
  trends: TrendData[]
  topCategories: Category[]
  fastestGrowing: Category[]
  lowestCompetition: Category[]
  lastUpdated: string
}

export interface CompareData {
  platforms: any[]
  crossMarketOpportunities: any[]
  comparisonMetrics: any[]
  platformStrengths: any[]
  lastUpdated: string
}

export interface RefreshLogEntry {
  id: string
  platform: string
  status: string
  duration: number
  message?: string
  createdAt: string
}

export const PLATFORM_CONFIG = {
  gumroad: {
    name: 'Gumroad',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-500',
    label: 'Dijital Urun',
    productLabel: 'Urun',
    salesLabel: 'Satis',
    icon: 'ShoppingCart',
    api: '/api/market',
  },
  capafy: {
    name: 'Capafy AI',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-teal-500',
    label: 'AI Skill',
    productLabel: 'Skill',
    salesLabel: 'Satis',
    icon: 'Bot',
    api: '/api/capafy',
  },
} as const

export type PlatformName = keyof typeof PLATFORM_CONFIG
