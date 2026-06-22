import { Activity, Globe, RefreshCw, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RefreshProgress } from '@/components/refresh-progress'

interface HeaderProps {
  isRefreshing: boolean
  lastUpdated?: string | null
  onRefresh: () => void
}

export function Header({ isRefreshing, lastUpdated, onRefresh }: HeaderProps) {
  return (
    <>
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
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Gumroad + Udemy + Capafy AI | 3 Pazaryeri Karsilastirmali Analiz</p>
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
                onClick={onRefresh}
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
    </>
  )
}