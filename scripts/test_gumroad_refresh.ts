import { refreshPlatform } from '../src/lib/scrapers'

async function main() {
  console.log('=== Gumroad Refresh Test (pagination + tags_data) ===')
  console.log('Bu işlem ~3-5 dakika sürecek (12 kategori × max 5 sayfa = max 60 istek).\n')

  const startTime = Date.now()
  const r = await refreshPlatform('gumroad')
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
