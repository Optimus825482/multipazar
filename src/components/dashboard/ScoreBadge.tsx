import { Badge } from '@/components/ui/badge'

interface ScoreBadgeProps {
  score: number
  label?: string
}

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
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