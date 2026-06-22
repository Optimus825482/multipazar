import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface CategoryRevenueChartProps {
  data: Array<{
    name: string
    fullName: string
    revenue: number
    color: string
  }>
}

export function CategoryRevenueChart({ data }: CategoryRevenueChartProps) {
  return (
    <Card className="border-0 shadow-md shadow-black/5">
      <CardHeader className="pb-1.5 sm:pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold">Kategori Bazli Gelir</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Toplam gelir dagilimi</CardDescription>
          </div>
          <PieIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(0)}M` : `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: number) => [formatNumber(value), 'Gelir']} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (<Cell key={`rev-${index}`} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
