import cron from 'node-cron'
import { refreshAllPlatforms } from '@/lib/refresh'
import { purgeExpiredEntries } from '@/lib/cache'

let isRunning = false

export function startCronJob() {
  if (isRunning) return
  isRunning = true

  // Her 6 saatte bir calis: 00:00, 06:00, 12:00, 18:00
  cron.schedule('0 */6 * * *', async () => {
    console.log(`[Cron] Otomatik veri yenileme basliyor... ${new Date().toISOString()}`)
    try {
      const results = await refreshAllPlatforms()
      console.log(`[Cron] Yenileme tamamlandi:`, results.map(r => `${r.platform}:${r.status}`).join(', '))
    } catch (error) {
      console.error('[Cron] Yenileme hatasi:', error)
    }
  })

  // Her 30 dakikada bir cache temizle (API cache'leri yenilensin)
  cron.schedule('*/30 * * * *', () => {
    const purged = purgeExpiredEntries()
    if (purged > 0) {
      console.log(`[Cron] Sureli dolmus ${purged} cache entry temizlendi`)
    }
  })

  console.log('[Cron] Zamanlanmis gorevler baslatildi (her 6 saatte bir refresh, her 30 dk cache temizleme)')
}
