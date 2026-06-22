import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Package, Search, TrendingUp, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatNumber, formatCount } from '@/lib/utils'
import { PLATFORM_CONFIG } from '@/lib/utils'

interface OverviewCardsProps {
  data: any
  platform: 'gumroad' | 'capafy'
}

export function OverviewCards({ data, platform }: OverviewCardsProps) {
  const config = PLATFORM_CONFIG[platform]
  const categories = data.categories || []

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {[
        { label: 'Toplam Gelir', value: formatNumber(data.overview?.totalRevenue || 0), icon: DollarSign, color: config.gradient, change: '+18%', up: true },
        { label: `Toplam ${config.productLabel}`, value: formatCount(data.overview?.totalProducts || data.overview?.totalCourses || 0), icon: Package, color: 'from-violet-500 to-purple-500', change: '+12%', up: true },
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
  )
}