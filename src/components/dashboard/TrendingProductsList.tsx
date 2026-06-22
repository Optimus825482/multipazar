import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Flame, Sparkles } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import { safeNum } from '@/lib/utils'

interface TrendingProductsListProps {
  data: any
  platform: 'gumroad' | 'capafy'
}

export function TrendingProductsList({ data, platform }: TrendingProductsListProps) {
  const config = platform === 'gumroad' ? { productLabel: 'Urun' } : { productLabel: 'Skill' }
  const platformColor = platform === 'gumroad' ? '#f97316' : '#06b6d4'

  return (
    <Card className="border-0 shadow-md shadow-black/5">
      <CardHeader className="pb-1.5 sm:pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold">Trend {config.productLabel}ler</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">En yuksek firsat skoru</CardDescription>
          </div>
          <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <div className="space-y-2.5">
            {data.trendingProducts?.slice(0, 8).map((p: any, i: number) => (
              <div key={p.name || `trend-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.category?.color || platformColor}20` }}>
                  <Sparkles className="w-4 h-4" style={{ color: p.category?.color || platformColor }} />
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
  )
}
