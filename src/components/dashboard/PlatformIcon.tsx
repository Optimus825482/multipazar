import { ShoppingCart, Bot, BarChart3 } from 'lucide-react'

interface PlatformIconProps {
  platform: string
  className?: string
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  switch (platform) {
    case 'gumroad': return <ShoppingCart className={className || "w-4 h-4"} />
    case 'capafy': return <Bot className={className || "w-4 h-4"} />
    default: return <BarChart3 className={className || "w-4 h-4"} />
  }
}