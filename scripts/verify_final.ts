/**
 * Her iki platformun final DB durumunu karşılaştır.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('=== MULPAZ Final DB Durumu ===\n')

  for (const platform of ['capafy', 'gumroad'] as const) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`PLATFORM: ${platform.toUpperCase()}`)
    console.log('='.repeat(50))

    const cats = await db.category.findMany({
      where: { platform },
      orderBy: { totalProducts: 'desc' },
    })
    console.log(`Kategori: ${cats.length}`)
    let totalSample = 0
    let totalReal = 0
    let totalRevenue = 0
    for (const c of cats) {
      const real = c.realTotalProducts ?? c.totalProducts
      totalSample += c.totalProducts
      totalReal += real
      totalRevenue += c.totalRevenue
      console.log(
        `  ${c.slug.padEnd(22)} sample=${c.totalProducts.toString().padStart(4)} realTotal=${(c.realTotalProducts ?? '-').toString().padStart(5)} demand=${c.demandScore.toString().padStart(4)} supply=${c.supplyScore.toString().padStart(4)} growth=${(c.growthRate + '%').padStart(6)}`
      )
    }
    console.log(`  TOPLAM SAMPLE: ${totalSample}`)
    console.log(`  TOPLAM REAL:   ${totalReal}`)
    console.log(`  TOPLAM REVENUE (estimated): $${Math.round(totalRevenue).toLocaleString()}`)

    const products = await db.product.count({ where: { platform } })
    console.log(`Ürün: ${products}`)

    const freeTrial = await db.product.count({ where: { platform, hasFreeTrial: true } })
    const free = await db.product.count({ where: { platform, isFree: true } })
    console.log(`Ücretsiz: ${free}, Free trial: ${freeTrial}`)

    const tagCount = await db.tag.count({ where: { platform } })
    const trendingTags = await db.tag.findMany({
      where: { platform, productCount: { gt: 0 } },
      orderBy: { productCount: 'desc' },
      take: 5,
    })
    console.log(`Tag'ler: ${tagCount} (top 5: ${trendingTags.map(t => `${t.name}=${t.productCount}`).join(', ')})`)

    const dsrCount = await db.dataSourceRun.count({ where: { platform } })
    console.log(`DataSourceRun: ${dsrCount}`)
  }

  console.log('\n' + '='.repeat(50))
  console.log('GENEL ÖZET')
  console.log('='.repeat(50))
  const totalCategories = await db.category.count()
  const totalProducts = await db.product.count()
  const totalTags = await db.tag.count()
  const totalRefreshJobs = await db.refreshJob.count()
  const totalRefreshLogs = await db.refreshLog.count()
  console.log(`Kategoriler: ${totalCategories}`)
  console.log(`Ürünler: ${totalProducts}`)
  console.log(`Tag'ler: ${totalTags}`)
  console.log(`RefreshJob (eski): ${totalRefreshJobs}`)
  console.log(`RefreshLog (yeni): ${totalRefreshLogs}`)

  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
