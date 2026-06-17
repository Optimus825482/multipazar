'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp, DollarSign, Search,
  Zap, Target, BarChart3, Lightbulb, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Star, Package,
  Flame, Crown, Layers, PieChart as PieIcon, Sparkles, Shield,
  Timer, Users, Activity, Globe,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  icon: string
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
  products?: Product[]
  revenueShare?: number
  productCount?: number
  gapScore?: number
  estimatedMonthlyDemand?: number
  estimatedMonthlySupply?: number
  unmetDemand?: number
}

interface Product {
  id: string
  name: string
  categoryId: string
  category?: Category
  price: number
  salesCount: number
  revenue: number
  rating: number
  reviewCount: number
  searchVolume: number
  demandScore: number
  supplyScore: number
  opportunityScore: number
  tags: string
  type: string
  avgMonthlySales: number
  priceRange: string
  isTrending: boolean
}

interface Insight {
  id: string
  title: string
  description: string
  insightType: string
  impactScore: number
  source?: string
}

interface TrendData {
  keyword: string
  data: { month: string; volume: number }[]
  growthRate: number
  avgVolume: number
}

interface ProductIdea {
  name: string
  category: string
  estimatedPrice: number
  estimatedMonthlySales: number
  estimatedMonthlyRevenue: number
  demandScore: number
  supplyScore: number
  gapScore: number
  difficulty: string
  timeToCreate: string
  reason: string
  sourceUrl?: string
}

const CHART_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f43f5e', '#a855f7', '#14b8a6', '#eab308', '#3b82f6', '#22c55e', '#6366f1']

function formatNumber(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toLocaleString()
}

function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const color = score >= 8.5 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
    score >= 7 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-red-600 bg-red-50 border-red-200'
  return (
    <Badge variant="outline" className={`${color} font-mono text-sm`}>
      {label && <span className="mr-1 opacity-70">{label}</span>}
      {score.toFixed(1)}
    </Badge>
  )
}

export default function Home() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [opportunities, setOpportunities] = useState<any>(null)
  const [trends, setTrends] = useState<TrendData[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('revenue')

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/market')
        const data = await res.json()

        setDashboardData(data)
        setCategories(data.categories || [])
        setOpportunities(data.opportunities || null)
        setTrends(data.trends || [])
        setInsights(data.insights || [])
        setProducts(data.products || [])
      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat)
    if (dashboardData?.products) {
      if (cat === 'all') {
        setProducts(dashboardData.products)
      } else {
        setProducts(dashboardData.products.filter((p: Product) => p.category?.slug === cat))
      }
    }
  }

  function handleSortChange(sort: string) {
    setSortBy(sort)
    if (products.length > 0) {
      const sorted = [...products].sort((a, b) => {
        switch (sort) {
          case 'revenue': return (b.revenue || 0) - (a.revenue || 0)
          case 'sales': return b.salesCount - a.salesCount
          case 'demand': return b.demandScore - a.demandScore
          case 'opportunity': return (b.opportunityScore || 0) - (a.opportunityScore || 0)
          default: return (b.revenue || 0) - (a.revenue || 0)
        }
      })
      setProducts(sorted)
    }
  }

  const categoryRevenueData = categories.map((c) => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
    fullName: c.name,
    revenue: c.totalRevenue,
    color: c.color,
  }))

  const categoryGrowthData = categories.map((c) => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
    fullName: c.name,
    growth: c.growthRate,
    color: c.color,
  }))

  const demandSupplyData = categories.map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '...' : c.name,
    fullName: c.name,
    demand: c.demandScore,
    supply: c.supplyScore,
    gap: Math.round((c.demandScore - c.supplyScore) * 10) / 10,
  }))

  const pieData = categories.slice(0, 8).map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
    fullName: c.name,
    value: c.totalRevenue,
    color: c.color,
  }))

  const opportunityScatterData = categories.map((c) => ({
    x: c.supplyScore,
    y: c.demandScore,
    z: c.totalRevenue,
    name: c.name,
    growth: c.growthRate,
  }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-orange-50">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
          </div>
          <p className="text-muted-foreground text-lg font-medium">Pazar verileri yukleniyor...</p>
          <p className="text-muted-foreground text-sm">Gumroad analiz motoru baslatiliyor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Gumroad Pazar Analiz Pro
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Gercek Veriler: InsightRaider, Reddit, Gumroad, Sacra</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                <Activity className="w-3 h-3" />
                Canli Veriler
              </Badge>
              <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                12 Kategori
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-white border shadow-sm h-auto p-1 flex-wrap gap-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kategoriler</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Urunler</span>
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Firsatlar</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Trendler</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1.5 px-3 sm:px-4 text-xs sm:text-sm">
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pazar Zekasi</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== DASHBOARD TAB ==================== */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Toplam Gelir', value: formatNumber(dashboardData?.overview?.totalRevenue || 0), icon: DollarSign, color: 'from-orange-500 to-amber-500', change: '+18.5%', up: true },
                { label: 'Toplam Urun', value: formatCount(dashboardData?.overview?.totalProducts || 0), icon: Package, color: 'from-violet-500 to-purple-500', change: '+12.3%', up: true },
                { label: 'Arama Hacmi', value: formatCount(dashboardData?.overview?.totalSearchVolume || 0), icon: Search, color: 'from-cyan-500 to-teal-500', change: '+24.7%', up: true },
                { label: 'Ort. Buyume', value: `${(dashboardData?.overview?.avgGrowthRate || 0).toFixed(1)}%`, icon: TrendingUp, color: 'from-emerald-500 to-green-500', change: '+5.2%', up: true },
                { label: 'Kategori Sayisi', value: dashboardData?.overview?.totalCategories || 0, icon: Layers, color: 'from-pink-500 to-rose-500', change: '+2 yeni', up: true },
              ].map((card, i) => (
                <Card key={i} className="border-0 shadow-lg shadow-black/5 overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-md`}>
                        <card.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-emerald-600' : 'text-red-600'}`}>
                        {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.change}
                      </div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg shadow-black/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Kategori Bazli Gelir Dagilimi</CardTitle>
                      <CardDescription className="text-xs">Toplam gelir kategori bazinda</CardDescription>
                    </div>
                    <PieIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryRevenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          formatter={(value: number) => [formatNumber(value), 'Gelir']}
                          labelFormatter={(label, payload) => {
                            const item = payload?.[0]?.payload
                            return item?.fullName || label
                          }}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                          {categoryRevenueData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg shadow-black/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Talep vs Arz Analizi</CardTitle>
                      <CardDescription className="text-xs">Kategorilerin talep ve arz skorlari</CardDescription>
                    </div>
                    <Target className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={demandSupplyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Bar dataKey="demand" fill="#10b981" name="Talep" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="supply" fill="#f43f5e" name="Arz" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Growth Chart */}
              <Card className="border-0 shadow-lg shadow-black/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Buyume Oranlari</CardTitle>
                  <CardDescription className="text-xs">En hizli buyuyen kategoriler (%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryGrowthData.sort((a, b) => b.growth - a.growth).slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                          formatter={(value: number) => [`${value}%`, 'Buyume']}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Bar dataKey="growth" radius={[0, 6, 6, 0]}>
                          {categoryGrowthData.sort((a, b) => b.growth - a.growth).slice(0, 8).map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="border-0 shadow-lg shadow-black/5 lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">En Cok Satan Urunler</CardTitle>
                      <CardDescription className="text-xs">Gelire gore siralanmis en basarili urunler</CardDescription>
                    </div>
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3">
                      {dashboardData?.topProducts?.slice(0, 8).map((p: Product, i: number) => (
                        <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-transparent to-orange-50/50 hover:from-orange-50/50 transition-colors">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i < 3 ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md' : 'bg-muted text-muted-foreground'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{p.name}</span>
                              {p.isTrending && <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600 border-red-200 gap-0.5"><Flame className="w-2.5 h-2.5" />Trend</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{p.category?.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold text-sm">{formatNumber(p.revenue)}</div>
                            <div className="text-xs text-muted-foreground">{p.salesCount.toLocaleString()} satis</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Trending + Fastest Growing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg shadow-black/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Trend Urunler</CardTitle>
                      <CardDescription className="text-xs">Yuksek firsat skorlu trend urunler</CardDescription>
                    </div>
                    <Flame className="w-4 h-4 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[260px]">
                    <div className="space-y-2.5">
                      {dashboardData?.trendingProducts?.map((p: Product, i: number) => (
                        <div key={p.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.category?.color + '20' }}>
                            <Sparkles className="w-4 h-4" style={{ color: p.category?.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.category?.name}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ScoreBadge score={p.opportunityScore} />
                            <Badge variant="outline" className="text-xs">${p.price}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Lowest Competition */}
              <Card className="border-0 shadow-lg shadow-black/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">En Dusuk Rekabetli Kategoriler</CardTitle>
                      <CardDescription className="text-xs">Yeni girenler icin en uygun kategoriler</CardDescription>
                    </div>
                    <Shield className="w-4 h-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[260px]">
                    <div className="space-y-2.5">
                      {dashboardData?.lowestCompetition?.map((c: Category, i: number) => (
                        <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + '20' }}>
                            <span className="text-xs font-bold" style={{ color: c.color }}>#{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.totalProducts.toLocaleString()} urun</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ScoreBadge score={c.competitionIndex} label="RI" />
                            <div className={`text-xs font-medium flex items-center gap-0.5 ${c.growthRate > 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <TrendingUp className="w-3 h-3" />{c.growthRate}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== CATEGORIES TAB ==================== */}
          <TabsContent value="categories" className="space-y-6">
            {/* Category Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Card key={cat.slug} className="border-0 shadow-lg shadow-black/5 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  <div className="h-1.5" style={{ backgroundColor: cat.color }} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold group-hover:text-orange-600 transition-colors">{cat.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">{cat.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[10px] ${cat.trendDirection === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : cat.trendDirection === 'down' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {cat.trendDirection === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : cat.trendDirection === 'down' ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
                          {cat.trendDirection === 'up' ? 'Yukseliyor' : cat.trendDirection === 'down' ? ' Dusuyor' : 'Stabil'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold" style={{ color: cat.color }}>{formatNumber(cat.totalRevenue)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Toplam Gelir</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/50">
                        <div className="text-lg font-bold" style={{ color: cat.color }}>{cat.totalProducts.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Toplam Urun</div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Talep Skoru</span>
                          <span className="font-mono font-semibold text-emerald-600">{cat.demandScore}</span>
                        </div>
                        <Progress value={cat.demandScore * 10} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Arz Skoru</span>
                          <span className="font-mono font-semibold text-red-500">{cat.supplyScore}</span>
                        </div>
                        <Progress value={cat.supplyScore * 10} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Buyume Orani</span>
                          <span className="font-mono font-semibold" style={{ color: cat.color }}>{cat.growthRate}%</span>
                        </div>
                        <Progress value={Math.min(cat.growthRate * 1.5, 100)} className="h-1.5" />
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Search className="w-3 h-3" />
                        <span>{formatCount(cat.searchVolume)} arama/ay</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Star className="w-3 h-3" />
                        <span>Ort. ${cat.avgPrice}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>RI: {cat.competitionIndex}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================== PRODUCTS TAB ==================== */}
          <TabsContent value="products" className="space-y-6">
            {/* Filters */}
            <Card className="border-0 shadow-lg shadow-black/5">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full sm:w-[250px]">
                      <SelectValue placeholder="Kategori Sec" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Kategoriler</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Siralama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Gelire Gore</SelectItem>
                      <SelectItem value="sales">Satista Gore</SelectItem>
                      <SelectItem value="demand">Talepe Gore</SelectItem>
                      <SelectItem value="opportunity">Firsat Skoru</SelectItem>
                      <SelectItem value="trending">Trend Urunler</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product, i) => (
                <Card key={product.name} className="border-0 shadow-lg shadow-black/5 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  <div className="h-1" style={{ backgroundColor: product.category?.color || '#f97316' }} />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (product.category?.color || '#f97316') + '15' }}>
                        <span className="text-lg font-bold" style={{ color: product.category?.color || '#f97316' }}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm group-hover:text-orange-600 transition-colors truncate">{product.name}</h3>
                          {product.isTrending && (
                            <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600 border-red-200 gap-0.5">
                              <Flame className="w-2.5 h-2.5" />Trend
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]" style={{ borderColor: product.category?.color, color: product.category?.color }}>
                            {product.category?.name}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{product.type}</Badge>
                          <Badge variant="outline" className="text-[10px]">{product.priceRange}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <div className="text-sm font-bold text-orange-600">${product.price}</div>
                        <div className="text-[10px] text-muted-foreground">Fiyat</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <div className="text-sm font-bold">{formatCount(product.salesCount)}</div>
                        <div className="text-[10px] text-muted-foreground">Satis</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <div className="text-sm font-bold">{product.rating}</div>
                        <div className="text-[10px] text-muted-foreground">Puan ({product.reviewCount})</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50 text-center">
                        <div className="text-sm font-bold text-emerald-600">{formatNumber(product.revenue)}</div>
                        <div className="text-[10px] text-muted-foreground">Gelir</div>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <ScoreBadge score={product.demandScore} label="Talep" />
                      <ScoreBadge score={product.supplyScore} label="Arz" />
                      <ScoreBadge score={product.opportunityScore} label="Firsat" />
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1 mt-3 flex-wrap">
                      {product.tags.split(',').map((tag, ti) => (
                        <Badge key={ti} variant="secondary" className="text-[10px]">{tag.trim()}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================== OPPORTUNITIES TAB ==================== */}
          <TabsContent value="opportunities" className="space-y-6">
            {/* Opportunity Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-3xl font-bold text-emerald-700">{opportunities?.summary?.totalOpportunities || 0}</div>
                  <div className="text-sm text-emerald-600 mt-1">Toplam Firsat</div>
                  <div className="text-xs text-emerald-500 mt-1">Yuksek talep / Dusuk arz urunleri</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-orange-50 to-amber-50">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-700">{opportunities?.summary?.avgGapScore?.toFixed(1) || 0}</div>
                  <div className="text-sm text-orange-600 mt-1">Ort. Gap Skoru</div>
                  <div className="text-xs text-orange-500 mt-1">Talep-Arz arasindaki fark</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg shadow-black/5 bg-gradient-to-br from-violet-50 to-purple-50">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="text-3xl font-bold text-violet-700">{opportunities?.productIdeas?.length || 0}</div>
                  <div className="text-sm text-violet-600 mt-1">Urun Fikri</div>
                  <div className="text-xs text-violet-500 mt-1">Hizli uretilebilecek urun onerileri</div>
                </CardContent>
              </Card>
            </div>

            {/* Opportunity Scatter Chart */}
            <Card className="border-0 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Talep-Arz Firsat Haritasi</CardTitle>
                    <CardDescription className="text-xs">Saga = Daha az arz, Yukari = Daha cok talep. Sag ust kose en buyuk firsat.</CardDescription>
                  </div>
                  <Target className="w-4 h-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" dataKey="x" name="Arz Skoru" domain={[0, 10]} tick={{ fontSize: 10 }} label={{ value: 'Arz Skoru →', position: 'bottom', offset: 0, fontSize: 11, fill: '#888' }} />
                      <YAxis type="number" dataKey="y" name="Talep Skoru" domain={[6, 10]} tick={{ fontSize: 10 }} label={{ value: 'Talep Skoru →', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fill: '#888' }} />
                      <ZAxis type="number" dataKey="z" range={[80, 600]} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'x') return [value.toFixed(1), 'Arz Skoru']
                          if (name === 'y') return [value.toFixed(1), 'Talep Skoru']
                          return [formatNumber(value), 'Gelir']
                        }}
                        labelFormatter={(label) => {
                          const d = opportunityScatterData.find(d => d.name === label)
                          return d?.name || String(label)
                        }}
                      />
                      <Scatter data={opportunityScatterData} fill="#f97316">
                        {opportunityScatterData.map((entry, index) => (
                          <Cell key={index} fill={entry.growth > 30 ? '#10b981' : entry.growth > 20 ? '#f97316' : '#eab308'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Product Ideas */}
            <Card className="border-0 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Hizli Satista Baslanabilecek Urun Onerileri</CardTitle>
                    <CardDescription className="text-xs">Yuksek talep, dusuk arz ve hizli olusturulabilir urun fikirleri</CardDescription>
                  </div>
                  <Sparkles className="w-4 h-4 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunities?.productIdeas?.map((idea: ProductIdea, i: number) => (
                    <div key={i} className="relative p-4 rounded-xl border-2 border-dashed hover:border-solid transition-all duration-300 group" style={{ borderColor: i < 3 ? '#10b981' : '#e5e7eb' }}>
                      {i < 3 && (
                        <Badge className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-[10px] gap-0.5">
                          <Zap className="w-2.5 h-2.5" />Oncelikli
                        </Badge>
                      )}
                      <h3 className="font-semibold text-sm mt-1 group-hover:text-orange-600 transition-colors">{idea.name}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1">{idea.category}</Badge>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="p-2 rounded-lg bg-muted/50 text-center">
                          <div className="text-sm font-bold text-orange-600">${idea.estimatedPrice}</div>
                          <div className="text-[10px] text-muted-foreground">Tahmini Fiyat</div>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50 text-center">
                          <div className="text-sm font-bold">{idea.estimatedMonthlySales.toLocaleString()}/ay</div>
                          <div className="text-[10px] text-muted-foreground">Aylik Satis</div>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50 text-center">
                          <div className="text-sm font-bold text-emerald-600">{formatNumber(idea.estimatedMonthlyRevenue)}/ay</div>
                          <div className="text-[10px] text-muted-foreground">Aylik Gelir</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <ScoreBadge score={idea.demandScore} label="Talep" />
                        <ScoreBadge score={idea.supplyScore} label="Arz" />
                        <ScoreBadge score={idea.gapScore} label="Gap" />
                      </div>

                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><Timer className="w-3 h-3" />{idea.timeToCreate}</div>
                        <div className="flex items-center gap-1"><Layers className="w-3 h-3" />Zorluk: {idea.difficulty}</div>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed bg-muted/30 p-2.5 rounded-lg">
                        {idea.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Gaps */}
            <Card className="border-0 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Kategori Bazli Talep-Arz Aciklari</CardTitle>
                <CardDescription className="text-xs">Talep ile arz arasindaki fark en buyuk kategoriler</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {opportunities?.categories?.map((cat: any, i: number) => (
                      <div key={cat.slug} className="p-4 rounded-xl border hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                              <span className="text-xs font-bold" style={{ color: cat.color }}>#{i + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">{cat.name}</h3>
                              <span className="text-xs text-muted-foreground">{cat.totalProducts.toLocaleString()} urun mevcut</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ScoreBadge score={cat.gapScore} label="Gap" />
                            <div className={`text-xs font-medium flex items-center gap-0.5 ${cat.growthRate > 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <TrendingUp className="w-3 h-3" />{cat.growthRate}%
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-2 rounded-lg bg-emerald-50 text-center">
                            <div className="text-sm font-bold text-emerald-700">{formatCount(cat.estimatedMonthlyDemand)}</div>
                            <div className="text-[10px] text-emerald-600">Tahmini Aylik Talep</div>
                          </div>
                          <div className="p-2 rounded-lg bg-red-50 text-center">
                            <div className="text-sm font-bold text-red-700">{formatCount(cat.estimatedMonthlySupply)}</div>
                            <div className="text-[10px] text-red-600">Tahmini Aylik Arz</div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 text-center">
                            <div className="text-sm font-bold text-amber-700">{Math.max(0, cat.unmetDemand).toLocaleString()}</div>
                            <div className="text-[10px] text-amber-600">Karsilanmayan Talep</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TRENDS TAB ==================== */}
          <TabsContent value="trends" className="space-y-6">
            {/* Trend Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.slice(0, 6).map((trend) => (
                <Card key={trend.keyword} className="border-0 shadow-lg shadow-black/5 overflow-hidden">
                  <div className={`h-1 ${trend.growthRate > 30 ? 'bg-emerald-500' : trend.growthRate > 10 ? 'bg-orange-500' : 'bg-amber-500'}`} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-sm">{trend.keyword}</h3>
                      <Badge variant="secondary" className={`text-[10px] ${trend.growthRate > 30 ? 'bg-emerald-50 text-emerald-600' : trend.growthRate > 10 ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>
                        +{trend.growthRate}%
                      </Badge>
                    </div>
                    <div className="h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`gradient-${trend.keyword}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={trend.growthRate > 30 ? '#10b981' : trend.growthRate > 10 ? '#f97316' : '#eab308'} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={trend.growthRate > 30 ? '#10b981' : trend.growthRate > 10 ? '#f97316' : '#eab308'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" tick={{ fontSize: 9 }} tickFormatter={(v) => v.split('-')[1]} />
                          <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => formatCount(v)} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                          <Area
                            type="monotone"
                            dataKey="volume"
                            stroke={trend.growthRate > 30 ? '#10b981' : trend.growthRate > 10 ? '#f97316' : '#eab308'}
                            fill={`url(#gradient-${trend.keyword})`}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Ort. {formatCount(trend.avgVolume)}/ay</span>
                      <span className="flex items-center gap-0.5 font-medium" style={{ color: trend.growthRate > 30 ? '#10b981' : trend.growthRate > 10 ? '#f97316' : '#eab308' }}>
                        {trend.growthRate > 30 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        Buyume trendi
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full Trend Chart */}
            <Card className="border-0 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">12 Aylik Arama Trendleri Karsilastirmasi</CardTitle>
                <CardDescription className="text-xs">Tum anahtar kelimelerin arama hacmi trendleri</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends[0]?.data?.map((d, i) => {
                      const row: Record<string, unknown> = { month: d.month.split('-')[1] + '/24' }
                      trends.forEach((t) => { row[t.keyword] = t.data[i]?.volume || 0 })
                      return row
                    }) || []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCount(v)} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {trends.slice(0, 6).map((trend, i) => (
                        <Line
                          key={trend.keyword}
                          type="monotone"
                          dataKey={trend.keyword}
                          stroke={CHART_COLORS[i % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== INSIGHTS TAB ==================== */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, i) => (
                <Card key={insight.title} className="border-0 shadow-lg shadow-black/5 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className={`h-1.5 ${insight.insightType === 'opportunity' ? 'bg-emerald-500' : insight.insightType === 'warning' ? 'bg-red-500' : 'bg-orange-500'}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        insight.insightType === 'opportunity' ? 'bg-emerald-100' :
                        insight.insightType === 'warning' ? 'bg-red-100' : 'bg-orange-100'
                      }`}>
                        {insight.insightType === 'opportunity' ? (
                          <Zap className="w-5 h-5 text-emerald-600" />
                        ) : insight.insightType === 'warning' ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm">{insight.title}</h3>
                          <Badge variant="outline" className={`text-[10px] ${
                            insight.insightType === 'opportunity' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                            insight.insightType === 'warning' ? 'text-red-600 border-red-200 bg-red-50' :
                            'text-orange-600 border-orange-200 bg-orange-50'
                          }`}>
                            {insight.insightType === 'opportunity' ? 'Firsat' : insight.insightType === 'warning' ? 'Uyari' : 'Trend'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            Etki Skoru: <span className="font-bold ml-1">{insight.impactScore}/10</span>
                          </Badge>
                          {insight.source && (
                            <Badge variant="outline" className="text-[10px]">
                              Kaynak: {insight.source}
                            </Badge>
                          )}
                          <Progress value={insight.impactScore * 10} className="h-1.5 flex-1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Market Radar */}
            <Card className="border-0 shadow-lg shadow-black/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Kategori Karsilastirma Radari</CardTitle>
                <CardDescription className="text-xs">Secili kategorilerin talep, arz, buyume ve rekabet skorlari</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                      { metric: 'Talep', ...Object.fromEntries(categories.slice(0, 6).map(c => [c.name, c.demandScore])) },
                      { metric: 'Buyume', ...Object.fromEntries(categories.slice(0, 6).map(c => [c.name, c.growthRate])) },
                      { metric: 'Firsat', ...Object.fromEntries(categories.slice(0, 6).map(c => [c.name, c.demandScore - c.supplyScore])) },
                    ].map(d => ({
                      metric: d.metric,
                      ...categories.slice(0, 6).map(c => ({
                        [c.name]: d.metric === 'Talep' ? c.demandScore : d.metric === 'Buyume' ? c.growthRate / 7 : c.demandScore - c.supplyScore,
                      })).reduce((a, b) => ({ ...a, ...b }), {}),
                    }))}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      {categories.slice(0, 6).map((cat, i) => (
                        <Radar
                          key={cat.slug}
                          name={cat.name}
                          dataKey={cat.name}
                          stroke={CHART_COLORS[i]}
                          fill={CHART_COLORS[i]}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      ))}
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 bg-white/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>Gumroad Pazar Analiz Pro</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Gercek pazar verileri | InsightRaider, Reddit (200K+ urun), Gumroad Discover, Sacra | 12 Kategori | 12+ Gercek Urun Analizi
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
