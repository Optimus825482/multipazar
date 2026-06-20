import { db } from '@/lib/db'
import { refreshPlatform as scrapeRefreshPlatform, refreshAllPlatforms as scrapeRefreshAllPlatforms, Platform } from '@/lib/scrapers/index'

/**
 * Eski statik veri importlarini kaldirip scraper tabanli refresh'e yonlendiriyoruz
 * Bu dosya backward compatibility icin tutuluyor
 */

type RefreshResult = { platform: Platform; status: 'success' | 'error'; duration: number; message: string }

/**
 * In-memory cache'i temizle
 */
function clearCache() {
  const globalCache = globalThis as unknown as {
    refreshCache?: Map<string, { data: unknown; timestamp: number }>
  }
  if (globalCache.refreshCache) {
    globalCache.refreshCache.clear()
  }
}

/**
 * Belirtilen platformu yeniler (scraper tabanli)
 */
export async function refreshPlatform(platform: Platform): Promise<RefreshResult> {
  return scrapeRefreshPlatform(platform)
}

/**
 * Tum platformlari yeniler
 */
export async function refreshAllPlatforms(): Promise<RefreshResult[]> {
  clearCache()
  const results = await scrapeRefreshAllPlatforms()
  clearCache()
  return results
}

/**
 * Son yenileme zamanini getir
 */
export async function getLastRefreshTimestamp(): Promise<{ platform: string; createdAt: Date } | null> {
  return db.refreshLog.findFirst({
    where: { platform: 'all', status: 'success' },
    orderBy: { createdAt: 'desc' },
    select: { platform: true, createdAt: true },
  })
}
