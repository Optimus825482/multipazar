'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { toast } from '@/hooks/use-toast'
import {
  TrendingUp, DollarSign, Search,
  Zap, Target, BarChart3, Lightbulb, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Star, Package,
  Flame, Crown, Layers, PieChart as PieIcon, Sparkles, Shield,
  Timer, Users, Activity, Globe, ShoppingCart, Bot,
  GitCompare, ChevronRight, ExternalLink, Trophy, RefreshCw, Clock,
} from 'lucide-react'
import { RefreshProgress } from '@/components/refresh-progress'

interface Category {
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

interface Product {
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

interface Insight {
  id?: string
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

interface PlatformData {
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

interface CompareData {
  platforms: any[]
  crossMarketOpportunities: any[]
  comparisonMetrics: any[]
  platformStrengths: any[]
  lastUpdated?: string
}

const CHART_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f43f5e', '#a855f7', '#14b8a6', '#eab308', '#3b82f6', '#22c55e', '#6366f1']

function formatNumber(n: number): string {
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function formatCount(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`
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

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  switch (platform) {
    case 'gumroad': return <ShoppingCart className={className || "w-4 h-4"} />
    case 'capafy': return <Bot className={className || "w-4 h-4"} />
    default: return <BarChart3 className={className || "w-4 h-4"} />
  }
}

const PLATFORM_CONFIG = {
  gumroad: { name: 'Gumroad', color: '#f97316', gradient: 'from-orange-500 to-amber-500', label: 'Dijital Urun', productLabel: 'Urun', salesLabel: 'Satis', api: '/api/market' },
  capafy: { name: 'Capafy AI', color: '#06b6d4', gradient: 'from-cyan-500 to-teal-500', label: 'AI Skill', productLabel: 'Skill', salesLabel: 'Satis', api: '/api/capafy' },
}

function safeNum(n: any, fallback: number = 0): number {
  return typeof n === 'number' && isFinite(n) ? n : fallback
}

function getProductCount(c: any): number {
  return safeNum(c.totalProducts)
}

function getOverviewCount(overview: any): number {
  return safeNum(overview?.totalProducts)
}

// Shared sub-tabs for each marketplace
function MarketplaceContent({ data, platform }: { data: PlatformData | null; platform: 'gumroad' | 'capafy' }) {
  const config = PLATFORM_CONFIG[platform]
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('revenue')
  const [innerTab, setInnerTab] = useState('dashboard')

  const products = useMemo(() => {
    const sourceProducts = data?.products || []
    const filtered = selectedCategory === 'all'
      ? sourceProducts
      : sourceProducts.filter((p: Product) => {
        const pCatSlug = p.category?.slug || ''
        return pCatSlug === selectedCategory || p.tags?.toLowerCase().includes(selectedCategory.replace(/-/g, ' '))
      })

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return (b.revenue || 0) - (a.revenue || 0)
        case 'sales': return (b.salesCount || b.studentCount || 0) - (a.salesCount || a.studentCount || 0)
        case 'demand': return b.demandScore - a.demandScore
        case 'opportunity': return (b.opportunityScore || 0) - (a.opportunityScore || 0)
        default: return (b.revenue || 0) - (a.revenue || 0)
      }
    })
  }, [data?.products, selectedCategory, sortBy])

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat)
  }

  function handleSortChange(sort: string) {
    setSortBy(sort)
  }

  if (!data) return <div className="text-center py-12 text-muted-foreground">Yukleniyor...</div>

  const categories = data.categories || []
  const categoryRevenueData = categories.map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
    fullName: c.name,
    revenue: c.totalRevenue,
    color: c.color,
  }))
  const categoryGrowthData = categories.map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '...' : c.name,
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
  const opportunityScatterData = categories.map((c) => ({
    x: c.supplyScore, y: c.demandScore, z: c.totalRevenue,
    name: c.name, growth: c.growthRate,
  }))

  const salesLabel = config.salesLabel
  const productLabel = config.productLabel

  return (
    <Tabs value={innerTab} onValueChange={setInnerTab} className="space-y-4 sm:space-y-6">
      <TabsList className="bg-white/50 border shadow-sm h-auto p-1 flex-wrap gap-1">
        {
          [
          { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { value: 'categories', label: 'Kategoriler', icon: Layers },
          { value: 'products', label: productLabel + 'ler', icon: Package },
          { value: 'opportunities', label: 'Firsatlar', icon: Zap },
          { value: 'trends', label: 'Trendler', icon: TrendingUp },
          { value: 'insights', label: 'Pazar Zekasi', icon: Lightbulb },
        ].map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}
            className={`gap-1 px-2 sm:px-3 text-[10px] sm:text-xs transition-all ${innerTab === tab.value ? 'text-white shadow-sm rounded-md' : 'hover:bg-muted/50'}`}
            style={innerTab === tab.value ? { backgroundColor: config.color } : undefined}>
            <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* DASHBOARD */}
      <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {[
            { label: 'Toplam Gelir', value: formatNumber(data.overview?.totalRevenue || 0), icon: DollarSign, color: config.gradient, change: '+18%', up: true },
            { label: `Toplam ${productLabel}`, value: formatCount(getOverviewCount(data.overview)), icon: Package, color: 'from-violet-500 to-purple-500', change: '+12%', up: true },
            { label: 'Arama Hacmi', value: formatCount(data.overview?.totalSearchVolume || 0), icon: Search, color: 'from-cyan-500 to-teal-500', change: '+24%', up: true },
            { label: 'Ort. Buyume', value: `${(data.overview?.avgGrowthRate || 0).toFixed(1)}%`, icon: TrendingUp, color: 'from-emerald-500 to-green-500', change: '+5%', up: true },
            { label: 'Kategori', value: data.overview?.totalCategories || 0, icon: Layers, color: 'from-pink-500 to-rose-500', change: `${categories.length} adet`, up: true },
          ].map((card, i) => (
            <Card key={`overview-${i}`} className="border-0 shadow-md shadow-black/5 overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-md`}>
                    <card.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className={`hidden sm:flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-emerald-600' : 'text-red-600'}`}>
                    {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {card.change}
                  </div>
                </div>
                <div className="text-lg sm:text-2xl font-bold tracking-tight">{card.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-sm sm:text-base font-semibold">Kategori Bazli Gelir</CardTitle><CardDescription className="text-[10px] sm:text-xs">Toplam gelir dagilimi</CardDescription></div>
                <PieIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryRevenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(0)}M` : `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: number) => [formatNumber(value), 'Gelir']} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {categoryRevenueData.map((entry, index) => (<Cell key={`rev-${index}`} fill={entry.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-sm sm:text-base font-semibold">Talep vs Arz</CardTitle><CardDescription className="text-[10px] sm:text-xs">Kategori skorlari</CardDescription></div>
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demandSupplyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />
                    <Bar dataKey="demand" fill="#10b981" name="Talep" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="supply" fill="#f43f5e" name="Arz" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trending + Lowest Competition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-sm sm:text-base font-semibold">Trend {productLabel}ler</CardTitle><CardDescription className="text-[10px] sm:text-xs">En yuksek firsat skoru</CardDescription></div>
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                <div className="space-y-2.5">
                  {data.trendingProducts?.slice(0, 8).map((p: Product, i: number) => (
                    <div key={p.name || `trend-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (p.category?.color || config.color) + '20' }}>
                        <Sparkles className="w-4 h-4" style={{ color: p.category?.color || config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.category?.name || p.tags?.split(',')[0]}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ScoreBadge score={safeNum(p.opportunityScore)} />
                        <Badge variant="outline" className="text-xs">${p.price}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-1.5 sm:pb-2">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-sm sm:text-base font-semibold">En Dusuk Rekabetli Kategoriler</CardTitle><CardDescription className="text-[10px] sm:text-xs">Yeni girenler icin uygun</CardDescription></div>
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px] sm:h-[280px]">
                <div className="space-y-2">
                  {data.lowestCompetition?.map((c: Category, i: number) => (
                    <div key={c.slug || `lc-${i}`} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: c.color + '20' }}>
                        <span className="text-[10px] sm:text-xs font-bold" style={{ color: c.color }}>#{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">{c.name}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{getProductCount(c).toLocaleString()} {productLabel.toLowerCase()}</div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <ScoreBadge score={safeNum(c.competitionIndex)} label="RI" />
                        <div className={`text-xs font-medium flex items-center gap-0.5 ${safeNum(c.growthRate) > 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          <TrendingUp className="w-3 h-3" />{safeNum(c.growthRate)}%
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

      {/* CATEGORIES */}
      <TabsContent value="categories" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <Card key={cat.slug} className="border-0 shadow-md shadow-black/5 overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <div className="h-1" style={{ backgroundColor: cat.color }} />
              <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                <div className="flex items-start justify-between gap-2">
                  <div><CardTitle className="text-sm sm:text-base font-semibold group-hover:text-orange-600 transition-colors">{cat.name}</CardTitle><CardDescription className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 line-clamp-2">{cat.description}</CardDescription></div>
                  <Badge variant="outline" className={`text-[10px] ${cat.trendDirection === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : cat.trendDirection === 'down' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {cat.trendDirection === 'up' ? <ArrowUpRight className="w-2.5 h-2.5" /> : cat.trendDirection === 'down' ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
                    {cat.trendDirection === 'up' ? 'Yukseliyor' : cat.trendDirection === 'down' ? ' Dusuyor' : 'Stabil'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 px-3 sm:px-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-muted/50"><div className="text-sm sm:text-lg font-bold" style={{ color: cat.color }}>{formatNumber(safeNum(cat.totalRevenue))}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Toplam Gelir</div></div>
                  <div className="p-2 rounded-lg bg-muted/50"><div className="text-sm sm:text-lg font-bold" style={{ color: cat.color }}>{getProductCount(cat).toLocaleString()}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Toplam {productLabel}</div></div>
                </div>
                <div className="space-y-2.5">
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Talep Skoru</span><span className="font-mono font-semibold text-emerald-600">{safeNum(cat.demandScore)}</span></div><Progress value={safeNum(cat.demandScore) * 10} className="h-1.5" /></div>
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Arz Skoru</span><span className="font-mono font-semibold text-red-500">{safeNum(cat.supplyScore)}</span></div><Progress value={safeNum(cat.supplyScore) * 10} className="h-1.5" /></div>
                  <div><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Buyume</span><span className="font-mono font-semibold" style={{ color: cat.color }}>{safeNum(cat.growthRate)}%</span></div><Progress value={Math.min(safeNum(cat.growthRate) * 1.5, 100)} className="h-1.5" /></div>
                </div>
                <div className="flex flex-wrap items-center justify-between pt-2 border-t text-[10px] sm:text-xs gap-1">
                  <div className="flex items-center gap-1 text-muted-foreground"><Search className="w-3 h-3" /><span>{formatCount(safeNum(cat.searchVolume))}/ay</span></div>
                  <div className="flex items-center gap-1 text-muted-foreground"><Star className="w-3 h-3" /><span>${safeNum(cat.avgPrice)}</span></div>
                  <div className="flex items-center gap-1 text-muted-foreground"><Users className="w-3 h-3" /><span>RI: {safeNum(cat.competitionIndex)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* PRODUCTS */}
      <TabsContent value="products" className="space-y-4 sm:space-y-6">
        <Card className="border-0 shadow-md shadow-black/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="Kategori Sec" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Kategoriler</SelectItem>
                  {categories.map((c) => (<SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Siralama" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Gelire Gore</SelectItem>
                  <SelectItem value="sales">{salesLabel}'a Gore</SelectItem>
                  <SelectItem value="demand">Talepe Gore</SelectItem>
                  <SelectItem value="opportunity">Firsat Skoru</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {products.slice(0, 20).map((product, i) => (
            <Card key={product.name || `prod-${i}`} className="border-0 shadow-md shadow-black/5 overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <div className="h-0.5" style={{ backgroundColor: product.category?.color || config.color }} />
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (product.category?.color || config.color) + '15' }}>
                    <span className="text-sm sm:text-lg font-bold" style={{ color: product.category?.color || config.color }}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h3 className="font-semibold text-xs sm:text-sm group-hover:text-orange-600 transition-colors truncate">{product.name}</h3>
                      {product.isTrending && <Badge variant="secondary" className="text-[9px] sm:text-[10px] bg-red-50 text-red-600 border-red-200 gap-0.5"><Flame className="w-2 h-2 sm:w-2.5 sm:h-2.5" />Trend</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: product.category?.color, color: product.category?.color }}>{product.category?.name}</Badge>
                      {product.instructor && <Badge variant="outline" className="text-[10px]">{product.instructor}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold text-orange-600">${product.price}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">Fiyat</div></div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold">{formatCount(product.salesCount || product.studentCount || 0)}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">{salesLabel}</div></div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold">{product.rating}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">Puan ({product.reviewCount})</div></div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold text-emerald-600">{formatNumber(product.revenue)}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">Gelir</div></div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
                  <ScoreBadge score={safeNum(product.demandScore)} label="Talep" />
                  <ScoreBadge score={safeNum(product.supplyScore)} label="Arz" />
                  <ScoreBadge score={safeNum(product.opportunityScore)} label="Firsat" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* OPPORTUNITIES */}
      <TabsContent value="opportunities" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border-0 shadow-md shadow-black/5 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardContent className="p-3 sm:p-5 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2 sm:mb-3"><Zap className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" /></div>
              <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{data.opportunities?.summary?.totalOpportunities || 0}</div>
              <div className="text-xs sm:text-sm text-emerald-600 mt-1">Toplam Firsat</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md shadow-black/5 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardContent className="p-3 sm:p-5 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2 sm:mb-3"><Target className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" /></div>
              <div className="text-2xl sm:text-3xl font-bold text-orange-700">{data.opportunities?.summary?.avgGapScore?.toFixed(1) || 0}</div>
              <div className="text-xs sm:text-sm text-orange-600 mt-1">Ort. Gap Skoru</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md shadow-black/5 bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="p-3 sm:p-5 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-2 sm:mb-3"><Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" /></div>
              <div className="text-2xl sm:text-3xl font-bold text-violet-700">{data.opportunities?.productIdeas?.length || 0}</div>
              <div className="text-xs sm:text-sm text-violet-600 mt-1">{productLabel} Fikri</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-md shadow-black/5">
          <CardHeader className="pb-1.5 sm:pb-2">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-sm sm:text-base font-semibold">Hizli Olusturulabilir {productLabel} Onerileri</CardTitle><CardDescription className="text-[10px] sm:text-xs">Yuksek talep, dusuk arz</CardDescription></div>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {data.opportunities?.productIdeas?.map((idea: ProductIdea, i: number) => (
                <div key={idea.name || `idea-${i}`} className="relative p-3 sm:p-4 rounded-xl border-2 border-dashed hover:border-solid transition-all duration-300 group" style={{ borderColor: i < 3 ? '#10b981' : '#e5e7eb' }}>
                  {i < 3 && <Badge className="absolute -top-2.5 left-4 bg-emerald-500 text-white text-[9px] sm:text-[10px] gap-0.5"><Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5" />Oncelikli</Badge>}
                  <h3 className="font-semibold text-xs sm:text-sm mt-1 group-hover:text-orange-600 transition-colors">{idea.name}</h3>
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] mt-1">{idea.category}</Badge>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold text-orange-600">${idea.estimatedPrice}</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">Fiyat</div></div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold">{(idea.estimatedMonthlySales || idea.estimatedMonthlyEnroll || 0).toLocaleString()}/ay</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">Aylik</div></div>
                    <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50 text-center"><div className="text-xs sm:text-sm font-bold text-emerald-600">{formatNumber(idea.estimatedMonthlyRevenue)}/ay</div><div className="text-[9px] sm:text-[10px] text-muted-foreground">Gelir</div></div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
                    <ScoreBadge score={safeNum(idea.demandScore)} label="Talep" /><ScoreBadge score={safeNum(idea.supplyScore)} label="Arz" /><ScoreBadge score={safeNum(idea.gapScore)} label="Gap" />
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{idea.timeToCreate}</div>
                    <div className="flex items-center gap-1"><Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />Zorluk: {idea.difficulty}</div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-3 leading-relaxed bg-muted/30 p-2 sm:p-2.5 rounded-lg">{idea.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TRENDS */}
      <TabsContent value="trends" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {(data.trends || []).slice(0, 6).map((trend) => (
            <Card key={trend.keyword} className="border-0 shadow-md shadow-black/5 overflow-hidden">
              <div className={`h-0.5 ${trend.growthRate > 30 ? 'bg-emerald-500' : trend.growthRate > 10 ? 'bg-orange-500' : 'bg-amber-500'}`} />
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <h3 className="font-semibold text-xs sm:text-sm">{trend.keyword}</h3>
                  <Badge variant="secondary" className={`text-[9px] sm:text-[10px] ${trend.growthRate > 30 ? 'bg-emerald-50 text-emerald-600' : trend.growthRate > 10 ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'}`}>+{trend.growthRate}%</Badge>
                </div>
                <div className="h-[100px] sm:h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs><linearGradient id={`grad-${platform}-${trend.keyword}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={trend.growthRate > 30 ? '#10b981' : '#f97316'} stopOpacity={0.3} /><stop offset="95%" stopColor={trend.growthRate > 30 ? '#10b981' : '#f97316'} stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} tickFormatter={(v) => v.split('-')[1]} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => formatCount(v)} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Area type="monotone" dataKey="volume" stroke={trend.growthRate > 30 ? '#10b981' : '#f97316'} fill={`url(#grad-${platform}-${trend.keyword})`} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* INSIGHTS */}
      <TabsContent value="insights" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {(data.insights || []).map((insight, i) => (
            <Card key={insight.title || `insight-${i}`} className="border-0 shadow-md shadow-black/5 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className={`h-1 ${insight.insightType === 'opportunity' ? 'bg-emerald-500' : insight.insightType === 'warning' ? 'bg-red-500' : 'bg-orange-500'}`} />
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${insight.insightType === 'opportunity' ? 'bg-emerald-100' : insight.insightType === 'warning' ? 'bg-red-100' : 'bg-orange-100'}`}>
                    {insight.insightType === 'opportunity' ? <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : insight.insightType === 'warning' ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /> : <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5">
                      <h3 className="font-semibold text-xs sm:text-sm">{insight.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${insight.insightType === 'opportunity' ? 'text-emerald-600 border-emerald-200' : insight.insightType === 'warning' ? 'text-red-600 border-red-200' : 'text-orange-600 border-orange-200'}`}>
                        {insight.insightType === 'opportunity' ? 'Firsat' : insight.insightType === 'warning' ? 'Uyari' : 'Trend'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">Etki: <span className="font-bold ml-1">{insight.impactScore}/10</span></Badge>
                      {insight.source && <Badge variant="outline" className="text-[10px]">Kaynak: {insight.source}</Badge>}
                      <Progress value={insight.impactScore * 10} className="h-1.5 flex-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default function Home() {
  const [activePlatform, setActivePlatform] = useState<'gumroad' | 'capafy' | 'compare'>('gumroad')
  const [platformData, setPlatformData] = useState<Record<string, PlatformData | null>>({ gumroad: null, capafy: null })
  const [compareData, setCompareData] = useState<CompareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const refreshProgressRef = useRef<any>(null)

  // Fetch platform data
  async function fetchPlatformData() {
    try {
      const [gumroad, capafy] = await Promise.all([
        fetch('/api/market').then(r => r.json()).catch(() => null),
        fetch('/api/capafy').then(r => r.json()).catch(() => null),
      ])
      setPlatformData({ gumroad, capafy })
      // Get latest timestamp from any platform
      const ts = gumroad?.lastUpdated || capafy?.lastUpdated
      if (ts) setLastUpdated(ts)
    } catch (e) {
      console.error('Fetch error:', e)
    }
  }

  // Manuel refresh - SSE benzeri polling ile jobId bazli bekleme
  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      // Platform status'lerini guncelle
      const rp = (window as any).__refreshProgress
      if (rp) {
        rp.updatePlatformStatus('gumroad', 'loading')
        setTimeout(() => rp.updatePlatformStatus('capafy', 'loading'), 1500)
      }

      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (res.status === 409) {
        // Zaten calisan job var - mevcut jobId ile poll et
        const jobId = data.job?.id
        if (jobId) {
          await pollRefreshJob(jobId)
        }
      } else if (data.status === 'started' && data.jobId) {
        // Yeni job baslatildi - poll ile bekle
        await pollRefreshJob(data.jobId)
      } else if (data.results) {
        // Eski davranis (immediate response)
        data.results.forEach((r: any) => {
          if (rp) rp.updatePlatformStatus(r.platform, r.status === 'success' ? 'success' : 'error')
        })
        await fetchPlatformData()
      }

      if (activePlatform === 'compare') {
        fetch('/api/compare').then(r => r.json()).then(setCompareData).catch(() => {})
      }
      toast({
        title: 'Veriler Guncelleniyor',
        description: 'Platform verileri arka planda yenileniyor...',
      })
    } catch (e) {
      toast({ title: 'Hata', description: 'Sunucu hatasi', variant: 'destructive' })
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  /**
   * JobId bazli polling - refresh tamamlanana kadar bekle, sonra UI guncelle.
   * Sabit timeout yerine gercek job durumunu bekler (H6 fix).
   */
  async function pollRefreshJob(jobId: string, maxWaitMs: number = 180000) {
    const pollIntervalMs = 2000
    const startedAt = Date.now()
    const rp = (window as any).__refreshProgress

    while (Date.now() - startedAt < maxWaitMs) {
      try {
        const res = await fetch(`/api/refresh?jobId=${encodeURIComponent(jobId)}`)
        if (res.ok) {
          const status = await res.json()
          if (status.job?.status === 'success') {
            // Platform bazli durumu guncelle
            if (rp && status.results) {
              status.results.forEach((r: any) => {
                rp.updatePlatformStatus(r.platform, r.status === 'success' ? 'success' : 'error')
              })
            }
            await fetchPlatformData()
            return
          }
          if (status.job?.status === 'error') {
            toast({ title: 'Hata', description: status.job.message || 'Yenileme basarisiz', variant: 'destructive' })
            return
          }
        }
      } catch (e) {
        console.error('Poll hatasi:', e)
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    }

    // Timeout - yine de UI guncellemeyi dene
    await fetchPlatformData()
  }

  // Initial data load - sadece mevcut veriyi yukle, refresh YAPMA
  useEffect(() => {
    async function init() {
      await fetchPlatformData()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (activePlatform === 'compare' && !compareData) {
      fetch('/api/compare').then(r => r.json()).then(setCompareData).catch(() => {})
    }
  }, [activePlatform, compareData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-orange-50">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
          </div>
          <p className="text-muted-foreground text-lg font-medium">Pazar verileri yukleniyor...</p>
          <p className="text-muted-foreground text-sm">3 Pazaryeri Analiz Motoru baslatiliyor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <RefreshProgress isRefreshing={isRefreshing} />
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
                  Multi-Pazar Analiz Pro
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Gumroad + Capafy AI | 2 Pazaryeri Karsilastirmali Analiz</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                <Activity className="w-3 h-3" />Canli Veriler
              </Badge>
              <Badge variant="secondary" className="flex sm:flex items-center gap-1 text-[10px] sm:text-xs">
                <Globe className="w-3 h-3" />3 Pazar
              </Badge>
              {/* Son Guncelleme Zamani */}
              {lastUpdated && (
                <Badge variant="outline" className="hidden md:flex items-center gap-1 text-[10px] sm:text-xs bg-white border-orange-200">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span className="text-muted-foreground">
                    {new Date(lastUpdated).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Badge>
              )}
              {/* Yenile Butonu */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-medium shadow-md hover:shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Guncelleniyor...' : 'Guncelle'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Platform Selector */}
          <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as any)} className="space-y-6">
            <TabsList className="bg-white border shadow-sm h-auto p-1 sm:p-1.5 flex-wrap gap-1">
              {[
                { value: 'gumroad', label: 'Gumroad', sublabel: 'Dijital Urun', icon: ShoppingCart, color: 'bg-orange-500' },
                { value: 'capafy', label: 'Capafy AI', sublabel: 'AI Skill', icon: Bot, color: 'bg-cyan-500' },
                { value: 'compare', label: 'Karsilastirma', sublabel: '2 Platform', icon: GitCompare, color: 'bg-gradient-to-r from-orange-500 via-cyan-500' },
              ].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}
                  className={`gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-sm rounded-lg transition-all ${activePlatform === tab.value ? 'text-white shadow-md' : 'hover:bg-muted/50'}`}
                  style={activePlatform === tab.value ? {
                    backgroundColor: tab.value === 'compare' ? undefined : tab.value === 'gumroad' ? '#f97316' : '#06b6d4',
                    backgroundImage: tab.value === 'compare' ? 'linear-gradient(to right, #f97316, #06b6d4)' : undefined,
                  } : undefined}>
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <div className="text-left">
                    <div className="font-semibold text-[11px] sm:text-sm leading-tight">{tab.label}</div>
                    <div className="text-[9px] sm:text-[10px] opacity-70 leading-tight">{tab.sublabel}</div>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

          {/* Marketplace Content */}
          {activePlatform !== 'compare' && (
            <MarketplaceContent
              key={activePlatform}
              data={platformData[activePlatform]}
              platform={activePlatform as 'gumroad' | 'capafy'}
            />
          )}

          {/* COMPARE TAB */}
          {activePlatform === 'compare' && compareData && (
            <div className="space-y-4 sm:space-y-6">
              {/* Platform Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                {compareData.platforms.map((p: any, i: number) => (
                  <Card key={`platform-${i}`} className="border-0 shadow-md shadow-black/5 overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: p.color }} />
                    <CardContent className="p-3 sm:p-5">
                      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}15` }}>
                          <PlatformIcon platform={p.name.toLowerCase().replace(/ ai/g, "")} className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-lg">{p.name}</h3>
                          <p className="text-xs text-muted-foreground">{p.type}</p>
                        </div>
                      </div>
                      {p.overview && (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Toplam Gelir</span><span className="font-semibold">{formatNumber(p.overview.totalRevenue)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Toplam Urun</span><span className="font-semibold">{formatCount(p.overview.totalProducts)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ort. Buyume</span><span className={`font-semibold ${p.overview.avgGrowthRate > 25 ? 'text-emerald-600' : 'text-amber-600'}`}>{p.overview.avgGrowthRate?.toFixed(1)}%</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ort. Fiyat</span><span className="font-semibold">${p.avgPrice}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Komisyon</span><span className={`font-semibold ${p.commissionRate <= 15 ? 'text-emerald-600' : p.commissionRate <= 30 ? 'text-amber-600' : 'text-red-600'}`}>{p.commissionRate}%</span></div>
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t">
                        <div className="text-xs font-semibold mb-2" style={{ color: p.color }}>En Hizli Buyume</div>
                        {p.topGrowthCategory && <div className="text-xs sm:text-sm">{p.topGrowthCategory.name} <span className="text-emerald-600">+{p.topGrowthCategory.growthRate}%</span></div>}
                        <div className="text-[10px] sm:text-xs font-semibold mt-2 sm:mt-3 mb-1 sm:mb-2" style={{ color: p.color }}>En Dusuk Rekabet</div>
                        {p.lowestCompetition && <div className="text-xs sm:text-sm">{p.lowestCompetition.name} <span className="text-emerald-600">RI: {p.lowestCompetition.competitionIndex}</span></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Comparison Radar Chart */}
              <Card className="border-0 shadow-md shadow-black/5">
                <CardHeader className="pb-1.5 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <div><CardTitle className="text-sm sm:text-base font-semibold">Platform Karsilastirma Radari</CardTitle><CardDescription className="text-[10px] sm:text-xs">Buyume, talep, rekabet, fiyat ve komisyon karsilastirmasi</CardDescription></div>
                    <GitCompare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] sm:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={compareData.comparisonMetrics.map(m => ({
                        metric: m.metric,
                        Gumroad: m.gumroad,
                        'Capafy AI': m.capafy,
                      }))}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis tick={{ fontSize: 9 }} />
                        <Radar name="Gumroad" dataKey="Gumroad" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                        <Radar name="Capafy AI" dataKey="Capafy AI" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cross-Market Opportunities */}
              <Card className="border-0 shadow-md shadow-black/5">
                <CardHeader className="pb-1.5 sm:pb-2">
                  <div className="flex items-center justify-between">
                    <div><CardTitle className="text-sm sm:text-base font-semibold">Capraz Pazar Firsatlari</CardTitle><CardDescription className="text-[10px] sm:text-xs">2 platformda da guclu talep goren konular</CardDescription></div>
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[500px] sm:max-h-[600px]">
                    <div className="space-y-3 sm:space-y-4">
                      {compareData.crossMarketOpportunities.map((opp: any, i: number) => (
                        <div key={`cross-${i}`} className="p-3 sm:p-4 rounded-xl border hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">{i + 1}</div>
                              <h3 className="font-semibold text-xs sm:text-sm">{opp.theme}</h3>
                            </div>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 whitespace-nowrap">{opp.bestPlatform}</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
                            {/* Gumroad */}
                            <div className="p-2.5 rounded-lg border-l-4" style={{ borderColor: '#f97316' }}>
                              <div className="flex items-center gap-1 mb-1"><ShoppingCart className="w-3 h-3 text-orange-500" /><span className="text-[10px] font-semibold text-orange-600">Gumroad</span></div>
                              <div className="text-xs font-medium">{opp.gumroad?.category || '-'}</div>
                              {opp.gumroad && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                  <span>Talep: {opp.gumroad.demand}</span>
                                  <span>Buyume: +{opp.gumroad.growth}%</span>
                                </div>
                              )}
                            </div>
                            {/* Capafy */}
                            <div className="p-2.5 rounded-lg border-l-4" style={{ borderColor: '#06b6d4' }}>
                              <div className="flex items-center gap-1 mb-1"><Bot className="w-3 h-3 text-cyan-500" /><span className="text-[10px] font-semibold text-cyan-600">Capafy</span></div>
                              <div className="text-xs font-medium">{opp.capafy?.category || '-'}</div>
                              {opp.capafy && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                  <span>Talep: {opp.capafy.demand}</span>
                                  <span>Buyume: +{opp.capafy.growth}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <p className="text-muted-foreground flex-1">{opp.recommendation}</p>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 ml-2 shrink-0">{opp.potentialRevenue}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Platform Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                {compareData.platformStrengths.map((ps: any, i: number) => (
                  <Card key={`strength-${i}`} className="border-0 shadow-md shadow-black/5">
                    <CardHeader className="pb-1.5 sm:pb-2">
                      <CardTitle className="text-sm sm:text-base font-semibold">{ps.platform}</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs">Guclu Yonler ve Zayifliklar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-emerald-600 mb-2">Guclu Yonler</h4>
                        <ul className="space-y-1">{ps.strengths.map((s: string, si: number) => <li key={si} className="text-xs text-muted-foreground flex items-start gap-1.5"><ArrowUpRight className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{s}</li>)}</ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-red-600 mb-2">Zayifliklar</h4>
                        <ul className="space-y-1">{ps.weaknesses.map((w: string, wi: number) => <li key={wi} className="text-xs text-muted-foreground flex items-start gap-1.5"><ArrowDownRight className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />{w}</li>)}</ul>
                      </div>
                      <div className="pt-3 border-t space-y-2">
                        <div><span className="text-[10px] text-muted-foreground uppercase">En Uygun Icin</span><p className="text-xs font-medium mt-0.5">{ps.bestFor}</p></div>
                        <div><span className="text-[10px] text-muted-foreground uppercase">Gelir Potansiyeli</span><p className="text-xs font-semibold text-emerald-600 mt-0.5">{ps.earningPotential}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!compareData && activePlatform === 'compare' && (
            <div className="text-center py-12">
              <div className="relative w-12 h-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
              </div>
              <p className="text-muted-foreground">Karsilastirma verileri yukleniyor...</p>
            </div>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-8 sm:mt-12 bg-white/80 backdrop-blur-sm shrink-0">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="font-medium">Multi-Pazar Analiz Pro</span>
            </div>
            <div className="text-[11px] sm:text-xs text-muted-foreground text-center">
              Gumroad + Capafy AI | Gercek Pazar Verileri | Karsilastirmali Analiz
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <Clock className="w-3 h-3 text-orange-400" />
                <span>Son Guncelleme: {new Date(lastUpdated).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  <span className="ml-1">(otomatik her 6 saatte bir)</span>
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Badge variant="outline" className="text-orange-600 border-orange-200 text-[10px] sm:text-xs"><ShoppingCart className="w-3 h-3 mr-1" />Gumroad</Badge>
              <Badge variant="outline" className="text-cyan-600 border-cyan-200 text-[10px] sm:text-xs"><Bot className="w-3 h-3 mr-1" />Capafy AI</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
