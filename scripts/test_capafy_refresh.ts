import { refreshPlatform } from '../src/lib/scrapers'

async function main() {
  console.log('=== Capafy Refresh Test ===')
  const startTime = Date.now()
  const r = await refreshPlatform('capafy')
  const duration = Date.now() - startTime

  console.log(`Süre: ${Math.round(duration / 1000)}s`)
  console.log(`Status: ${r.status === 'success' ? '✅' : '❌'}`)
  console.log(`Message: ${r.message}`)
  process.exit(r.status === 'success' ? 0 : 1)
}

main().catch((e) => {
  console.error('TEST HATASI:', e)
  process.exit(1)
})
