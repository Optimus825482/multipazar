import { BarChart3, Clock, ShoppingCart, Bot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FooterProps {
  lastUpdated?: string | null
}

export function Footer({ lastUpdated }: FooterProps) {
  return (
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
  )
}