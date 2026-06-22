import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { Target } from 'lucide-react'

interface DemandSupplyChartProps {
  data: Array<{
    name: string
    fullName: string
    demand: number
    supply: number
    gap: number
  }>
}

export function DemandSupplyChart({ data }: DemandSupplyChartProps) {
  return (
    <Card className="border-0 shadow-md shadow-black/5">
      <CardHeader className="pb-1.5 sm:pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold">Talep vs Arz</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Kategori skorlari</CardDescription>
          </div>
          <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
  )
}
