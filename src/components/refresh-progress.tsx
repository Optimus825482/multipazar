'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2, XCircle, Clock, ShoppingCart, Bot, Loader2 } from 'lucide-react'

type PlatformStatus = 'pending' | 'loading' | 'success' | 'error'

interface PlatformProgress {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  status: PlatformStatus
}

const initialStatuses: PlatformProgress[] = [
  { id: 'gumroad', name: 'Gumroad', icon: <ShoppingCart className="w-4 h-4" />, color: '#f97316', status: 'pending' },
  { id: 'capafy', name: 'Capafy AI', icon: <Bot className="w-4 h-4" />, color: '#06b6d4', status: 'pending' },
]

export function RefreshProgress({
  isRefreshing,
  onComplete,
  platforms = ['gumroad', 'capafy']
}: { 
  isRefreshing: boolean
  onComplete?: () => void
  platforms?: string[]
}) {
  const [progress, setProgress] = useState(() => isRefreshing ? 0 : 100)
  const [statuses, setStatuses] = useState<PlatformProgress[]>(initialStatuses)
  const [visible, setVisible] = useState(() => isRefreshing)

  useEffect(() => {
    if (isRefreshing) {
      const startTimer = setTimeout(() => {
        setVisible(true)
        setProgress(0)
        setStatuses(initialStatuses)
      }, 0)

      // Simule et: her platform sirayla yukleniyor
      // Gercek progres API'den donen sonuclara gore guncellenecek
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = Math.min(prev + 2, 95)
          return next
        })
      }, 300)

      return () => {
        clearTimeout(startTimer)
        clearInterval(interval)
      }
    } else {
      const completeTimer = setTimeout(() => {
        setProgress(100)
        setStatuses(prev => prev.map(s =>
          s.status === 'loading' ? { ...s, status: 'success' as PlatformStatus } : s
        ))
      }, 0)

      const timer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 1500)

      return () => {
        clearTimeout(completeTimer)
        clearTimeout(timer)
      }
    }
  }, [isRefreshing, onComplete])

  // Disardan platform status guncelleme
  const updatePlatformStatus = (platformId: string, status: PlatformStatus) => {
    setStatuses(prev => prev.map(s => s.id === platformId ? { ...s, status } : s))
  }

  // Export the update function for parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__refreshProgress = { updatePlatformStatus }
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__refreshProgress
      }
    }
  }, [])

  const StatusIcon = ({ status }: { status: PlatformStatus }) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-300" />
      case 'loading':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[100]"
        >
          {/* Progress bar - animasyonlu gradient */}
          <div className="h-1 bg-slate-100">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-violet-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Status panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-md bg-white/95 backdrop-blur-md border-x border-b border-slate-200 shadow-lg rounded-b-xl overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-orange-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-semibold text-slate-700">
                  {isRefreshing ? 'Pazar verileri guncelleniyor...' : 'Guncelleme tamamlandi!'}
                </span>
                <span className="ml-auto text-xs font-mono text-slate-400 tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Platform bazli durum */}
              <div className="space-y-1.5">
                {statuses.map((platform) => (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2.5 py-1 px-2 rounded-lg"
                    style={{ 
                      backgroundColor: platform.status === 'loading' ? `${platform.color}08` : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-[110px]">
                      <span style={{ color: platform.color }}>{platform.icon}</span>
                      <span className="text-xs font-medium text-slate-600">{platform.name}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        {platform.status === 'loading' && (
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: platform.color }}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 8, ease: 'easeInOut' }}
                          />
                        )}
                        {platform.status === 'success' && (
                          <div className="h-full w-full rounded-full bg-emerald-400" />
                        )}
                        {platform.status === 'error' && (
                          <div className="h-full w-full rounded-full bg-red-400" />
                        )}
                      </div>
                      <StatusIcon status={platform.status} />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Alt bilgi */}
              {isRefreshing && (
                <p className="text-[10px] text-slate-400 text-center">
                  Google Trends + Canli API verileri ile guncelleniyor
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
