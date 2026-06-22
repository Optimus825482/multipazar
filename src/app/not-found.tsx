import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
      <SearchX className="w-16 h-16 text-muted-foreground" />
      <h2 className="text-2xl font-semibold">Sayfa Bulunamadi</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Aradiginiz sayfa mevcut degil veya kaldirilmis olabilir.
      </p>
      <Button asChild variant="default">
        <Link href="/">Ana Sayfaya Don</Link>
      </Button>
    </div>
  )
}
