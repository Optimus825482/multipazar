/**
 * Capafy v2 scraper dry-run testi — gerçek API'yi çağırır, DB'ye yazmaz.
 * Sonuçları konsola döker.
 */
import { fetchAllCapafyCategories, CAPAFY_REAL_CATEGORIES } from '../src/lib/scrapers/capafy'

async function main() {
  console.log('=== Capafy v2 Dry-Run Test ===')
  console.log('Tanımlı kategori sayısı:', Object.keys(CAPAFY_REAL_CATEGORIES).length)
  for (const [slug, info] of Object.entries(CAPAFY_REAL_CATEGORIES)) {
    console.log(`  ${slug}: categoryIds=[${info.categoryIds.join(',')}] queries=${info.semanticQueries.length}`)
  }

  // İlk 3 kategoriyi test et (hızlı doğrulama)
  const testSlugs = ['ai-chatbot-agent', 'ai-writing', 'prompt-engineering']
  console.log('\n=== İlk 3 kategori scrape ===')

  const startTime = Date.now()
  const result = await fetchAllCapafyCategories(testSlugs)
  const duration = Date.now() - startTime

  console.log(`Toplam süre: ${duration}ms`)
  console.log(`Toplam sorgu: ${result.totalQueries}`)
  console.log(`Toplam unique agent: ${result.totalUniqueAgents}`)
  console.log(`Hatalar: ${result.errors.length}`)
  if (result.errors.length > 0) {
    result.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`))
  }

  console.log('\n=== Kategori Detayları ===')
  for (const [slug, cat] of result.categories) {
    console.log(`\n[${cat.name}] (slug: ${slug})`)
    console.log(`  Toplam ürün: ${cat.totalProducts}`)
    console.log(`  Real total: ${cat.realTotalProducts ?? 'yok'}`)
    console.log(`  Sample size: ${cat.sampleSize}`)
    console.log(`  Ortalama fiyat: $${cat.avgPrice}`)
    console.log(`  Ortalama rating: ${cat.avgRating}`)
    console.log(`  Ortalama reviews: ${cat.avgReviews}`)
    console.log(`  Ortalama creditScore: ${cat.avgCreditScore}`)
    console.log(`  Bedava ürün sayısı: ${cat.products.filter(p => p.isFree).length}`)
    console.log(`  Free trial: ${cat.products.filter(p => p.hasFreeTrial).length}`)
    console.log(`  Kategori ID dağılımı:`, cat.categoryIdDistribution)
    console.log(`  Kullanılan sorgular (${cat.queriesUsed.length}):`)
    cat.queriesUsed.forEach(q => console.log(`    - "${q}"`))
    console.log(`  İlk 3 ürün:`)
    cat.products.slice(0, 3).forEach(p => {
      console.log(`    - ${p.name} ($${p.price}, rating=${p.rating}, free=${p.isFree}, trial=${p.hasFreeTrial})`)
      console.log(`      URL: ${p.url}`)
      console.log(`      Tags: ${p.tags.join(', ')}`)
    })
  }
}

main().catch((e) => {
  console.error('TEST HATASI:', e)
  process.exit(1)
})
