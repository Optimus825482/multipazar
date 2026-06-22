/**
 * DB doğrulama script'i — yazılan verileri kontrol et
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('=== MULPAZ DB Doğrulama ===\n')

  // Kategori sayıları
  const capafyCats = await db.category.findMany({
    where: { platform: 'capafy' },
    orderBy: { totalProducts: 'desc' },
  })
  console.log(`Capafy kategorileri: ${capafyCats.length}`)

  let totalSample = 0
  let totalReal = 0
  for (const c of capafyCats) {
    const real = c.realTotalProducts ?? c.totalProducts
    totalSample += c.totalProducts
    totalReal += real
    console.log(
      `  ${c.slug.padEnd(25)} | sample=${c.totalProducts.toString().padStart(4)} | realTotal=${(c.realTotalProducts ?? '?').toString().padStart(4)} | catId=${(c.platformCategoryId ?? '-').padEnd(3)} | demand=${c.demandScore} supply=${c.supplyScore} | strategy=${c.scoringStrategy ?? c.scrapingStrategy ?? '?'}`
    )
  }
  console.log(`  TOPLAM SAMPLE: ${totalSample}`)
  console.log(`  TOPLAM REAL:   ${totalReal}`)

  // Ürün sayıları
  const productCount = await db.product.count({ where: { platform: 'capafy' } })
  console.log(`\nCapafy ürün sayısı: ${productCount}`)

  // Satış tahmin metodu dağılımı
  const salesMethod = await db.product.groupBy({
    by: ['salesEstimationMethod'],
    where: { platform: 'capafy' },
    _count: { _all: true },
  })
  console.log('\nSatış tahmin metodu dağılımı:')
  for (const m of salesMethod) {
    console.log(`  ${(m.salesEstimationMethod ?? 'null').padEnd(25)}: ${m._count._all}`)
  }

  // Free / trial dağılımı
  const freeCount = await db.product.count({ where: { platform: 'capafy', isFree: true } })
  const trialCount = await db.product.count({ where: { platform: 'capafy', hasFreeTrial: true } })
  console.log(`\nÜcretsiz: ${freeCount}, Free trial: ${trialCount}`)

  // URL örnekleri
  const sampleProducts = await db.product.findMany({
    where: { platform: 'capafy' },
    take: 5,
    select: { name: true, url: true, price: true, salesEstimationMethod: true, titleSlug: true, platformProductId: true },
  })
  console.log('\nÖrnek ürünler:')
  for (const p of sampleProducts) {
    console.log(`  ${p.name}`)
    console.log(`    URL: ${p.url}`)
    console.log(`    titleSlug: ${p.titleSlug}, platformProductId: ${p.platformProductId}`)
    console.log(`    Price: $${p.price}, salesMethod: ${p.salesEstimationMethod}`)
  }

  // Tag sayısı
  const tagCount = await db.tag.count({ where: { platform: 'capafy' } })
  console.log(`\nCapafy tag sayısı: ${tagCount}`)
  const topTags = await db.tag.findMany({
    where: { platform: 'capafy' },
    orderBy: { productCount: 'desc' },
    take: 10,
  })
  console.log('Top 10 tag:')
  for (const t of topTags) {
    console.log(`  ${t.name.padEnd(30)} (${t.productCount} ürün)`)
  }

  // DataSourceRun logları
  const dsrCount = await db.dataSourceRun.count({ where: { platform: 'capafy' } })
  console.log(`\nDataSourceRun logları (Capafy): ${dsrCount}`)
  const lastDsr = await db.dataSourceRun.findMany({
    where: { platform: 'capafy' },
    orderBy: { startedAt: 'desc' },
    take: 5,
  })
  console.log('Son 5 run:')
  for (const r of lastDsr) {
    console.log(`  ${r.startedAt.toISOString()} | ${r.source.padEnd(30)} | ${r.status.padEnd(8)} | fetched=${r.recordsFetched} saved=${r.recordsSaved} | ${r.errorMessage ?? ''}`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
