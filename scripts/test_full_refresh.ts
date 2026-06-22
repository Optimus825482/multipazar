/**
 * Full refresh test — tüm Capafy kategorilerini DB'ye yazar.
 * Capafy + Gumroad scraper v2'yi uçtan uca test eder.
 */
import { refreshAllPlatforms } from '../src/lib/scrapers'

async function main() {
  console.log('=== Full Refresh Test (v2) ===')
  console.log('Bu işlem ~3-5 dakika sürecek (Capafy ~1.5dk + Gumroad ~3dk).\n')

  const startTime = Date.now()
  const results = await refreshAllPlatforms()
  const duration = Date.now() - startTime

  console.log('\n=== Sonuç ===')
  console.log(`Toplam süre: ${Math.round(duration / 1000)}s`)
  for (const r of results) {
    const status = r.status === 'success' ? '✅' : '❌'
    console.log(`${status} ${r.platform}: ${r.duration}ms — ${r.message}`)
  }

  const allSuccess = results.every(r => r.status === 'success')
  process.exit(allSuccess ? 0 : 1)
}

main().catch((e) => {
  console.error('TEST HATASI:', e)
  process.exit(1)
})
