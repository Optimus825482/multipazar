/**
 * In-memory cache helper - API route'lari icin ortak cache katmani.
 *
 * ONEMLI: Next.js dev mode'da HMR ile modul yeniden yuklenir; bu yuzden
 * cache globalThis uzerinde tutulur (server instance'i hayatta kaldigi surece paylasilir).
 * Multi-instance deploy icin Redis tabanli cache gerekli (gelecek gelistirme).
 *
 * Single-instance icin bu yaklasim yeterli; cache restart'ta sifirlanir (kabul edilebilir,
 * cunku DB-backed bir sistem zaten var).
 */

interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
}

interface GlobalCache {
  refreshCache: Map<string, CacheEntry>
}

const globalCache = globalThis as unknown as GlobalCache

if (!globalCache.refreshCache) {
  globalCache.refreshCache = new Map<string, CacheEntry>()
}

/**
 * Cache'den deger doner; yoksa veya suresi dolmussa null doner + entry'yi siler.
 */
export function cachedFetch<T = unknown>(key: string): T | null {
  const entry = globalCache.refreshCache.get(key)
  if (!entry) return null
  // TTL kontrolu - dolmussa null don ve entry'yi sil
  if (Date.now() > entry.timestamp) {
    globalCache.refreshCache.delete(key)
    return null
  }
  return entry.data as T
}

/**
 * Cache'e deger yazar. Belirtilen sure kadar gecerli.
 */
export function setCached<T = unknown>(key: string, data: T, ttlMs: number): void {
  globalCache.refreshCache.set(key, { data, timestamp: Date.now() + ttlMs })
}

/**
 * Tum cache'i temizler (cron veya manuel refresh sonrasi cagirilir).
 */
export function clearCache(): void {
  globalCache.refreshCache.clear()
}

/**
 * Tum cache'i temizler ve dolmus entry'leri siler.
 * Cache temizleme interval'i tarafindan cagirilir.
 */
export function purgeExpiredEntries(): number {
  const now = Date.now()
  let purged = 0
  for (const [key, entry] of globalCache.refreshCache) {
    if (now > entry.timestamp) {
      globalCache.refreshCache.delete(key)
      purged++
    }
  }
  return purged
}

/**
 * Cache istatistikleri (debug + monitoring icin).
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: globalCache.refreshCache.size,
    keys: Array.from(globalCache.refreshCache.keys()),
  }
}
