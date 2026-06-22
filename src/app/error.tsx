'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Uygulama hatasi:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
      <AlertTriangle className="w-12 h-12 text-destructive" />
      <h2 className="text-xl font-semibold">Bir hata olustu</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Uygulama yuklenirken bir sorunla karsilasildi. Lutfen tekrar deneyin.
      </p>
      <Button onClick={reset} variant="default" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Tekrar Dene
      </Button>
    </div>
  )
}
