import { describe, it, expect, beforeEach } from 'vitest'
import { cachedFetch, setCached, clearCache, purgeExpiredEntries, getCacheStats } from '@/lib/cache'

describe('cache module', () => {
  beforeEach(() => {
    clearCache()
  })

  it('returns null on cache miss', () => {
    expect(cachedFetch('missing-key')).toBeNull()
  })

  it('returns cached value within TTL', () => {
    setCached('test-key', { foo: 'bar' }, 60_000)
    const value = cachedFetch<{ foo: string }>('test-key')
    expect(value).toEqual({ foo: 'bar' })
  })

  it('returns null after TTL expires', async () => {
    setCached('expiring-key', { x: 1 }, 1)
    await new Promise((r) => setTimeout(r, 10))
    expect(cachedFetch('expiring-key')).toBeNull()
  })

  it('clears all entries', () => {
    setCached('a', 1, 60_000)
    setCached('b', 2, 60_000)
    clearCache()
    expect(getCacheStats().size).toBe(0)
  })

  it('purges only expired entries', async () => {
    setCached('short', 'x', 1)
    setCached('long', 'y', 60_000)
    await new Promise((r) => setTimeout(r, 10))
    const purged = purgeExpiredEntries()
    expect(purged).toBe(1)
    expect(cachedFetch('short')).toBeNull()
    expect(cachedFetch('long')).toBe('y')
  })

  it('getCacheStats reports correct size and keys', () => {
    setCached('alpha', 1, 60_000)
    setCached('beta', 2, 60_000)
    const stats = getCacheStats()
    expect(stats.size).toBe(2)
    expect(stats.keys.sort()).toEqual(['alpha', 'beta'])
  })
})
