import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts'
import { Bot, GitCompare, GraduationCap, ShoppingCart, Trophy } from 'lucide-react'
import { formatNumber, formatCount } from '@/lib/utils'
import { PlatformIcon } from './PlatformIcon'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { CompareData } from '@/types'

interface CompareTabProps {
  compareData: CompareData
}

export function CompareTab({ compareData }: CompareTabProps) {
  return (
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
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Platform Karsilastirma Radari</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Buyume, talep, rekabet, fiyat ve komisyon karsilastirmasi</CardDescription>
            </div>
            <GitCompare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={compareData.comparisonMetrics.map(m => ({
                metric: m.metric,
                Gumroad: m.gumroad,
                Udemy: m.udemy,
                'Capafy AI': m.capafy,
              }))}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="Gumroad" dataKey="Gumroad" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} />
                <Radar name="Udemy" dataKey="Udemy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                <Radar name="Capafy AI" dataKey="Capafy AI" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeWidth={2} />
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
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Capraz Pazar Firsatlari</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">3 platformda da guclu talep goren konular</CardDescription>
            </div>
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
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">{i + 1}</div>
                      <h3 className="font-semibold text-xs sm:text-sm">{opp.theme}</h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 whitespace-nowrap">{opp.bestPlatform}</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
                    {/* Gumroad */}
                    <div className="p-2.5 rounded-lg border-l-4" style={{ borderColor: '#f97316' }}>
                      <div className="flex items-center gap-1 mb-1"><ShoppingCart className="w-3 h-3 text-orange-500" /><span className="text-[10px] font-semibold text-orange-600">Gumroad</span></div>
                      <div className="text-xs font-medium">{opp.gumroad.category}</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <span>Talep: {opp.gumroad.demand}</span>
                        <span>Buyume: +{opp.gumroad.growth}%</span>
                      </div>
                    </div>
                    {/* Udemy */}
                    <div className="p-2.5 rounded-lg border-l-4" style={{ borderColor: '#8b5cf6' }}>
                      <div className="flex items-center gap-1 mb-1"><GraduationCap className="w-3 h-3 text-violet-500" /><span className="text-[10px] font-semibold text-violet-600">Udemy</span></div>
                      <div className="text-xs font-medium">{opp.udemy.category}</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <span>Talep: {opp.udemy.demand}</span>
                        <span>Buyume: +{opp.udemy.growth}%</span>
                      </div>
                    </div>
                    {/* Capafy */}
                    <div className="p-2.5 rounded-lg border-l-4" style={{ borderColor: '#06b6d4' }}>
                      <div className="flex items-center gap-1 mb-1"><Bot className="w-3 h-3 text-cyan-500" /><span className="text-[10px] font-semibold text-cyan-600">Capafy AI</span></div>
                      <div className="text-xs font-medium">{opp.capafy.category}</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <span>Talep: {opp.capafy.demand}</span>
                        <span>Buyume: +{opp.capafy.growth}%</span>
                      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
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
  )
}
