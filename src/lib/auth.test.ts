import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { timingSafeEqualString, verifyCronSecret } from '@/lib/auth'

describe('auth - timingSafeEqualString', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqualString('abc123', 'abc123')).toBe(true)
    expect(timingSafeEqualString('', '')).toBe(true)
    expect(timingSafeEqualString('a-very-long-secret-string', 'a-very-long-secret-string')).toBe(true)
  })

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqualString('abc123', 'abc124')).toBe(false)
    expect(timingSafeEqualString('hello', 'world')).toBe(false)
  })

  it('returns false for different length strings', () => {
    expect(timingSafeEqualString('abc', 'abcd')).toBe(false)
    expect(timingSafeEqualString('short', 'a-much-longer-string')).toBe(false)
  })

  it('handles unicode correctly', () => {
    expect(timingSafeEqualString('çğşöü', 'çğşöü')).toBe(true)
    expect(timingSafeEqualString('çğşöü', 'cgsou')).toBe(false)
  })
})

describe('auth - verifyCronSecret', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    delete process.env.CRON_SECRET
  })

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.CRON_SECRET = originalSecret
    } else {
      delete process.env.CRON_SECRET
    }
  })

  it('returns false when CRON_SECRET is not configured', () => {
    expect(verifyCronSecret('any-header')).toBe(false)
    expect(verifyCronSecret(null)).toBe(false)
  })

  it('returns false when header is missing', () => {
    process.env.CRON_SECRET = 'configured-secret'
    expect(verifyCronSecret(null)).toBe(false)
  })

  it('returns true when header matches secret', () => {
    process.env.CRON_SECRET = 'configured-secret'
    expect(verifyCronSecret('configured-secret')).toBe(true)
  })

  it('returns false when header differs from secret', () => {
    process.env.CRON_SECRET = 'configured-secret'
    expect(verifyCronSecret('wrong-secret')).toBe(false)
    expect(verifyCronSecret('')).toBe(false)
  })

  it('does not leak length info via early return timing', () => {
    // Bu test timing attack korumasini dogrulamaz (gercek zamanlama olcumu gerekir),
    // ama fonksiyonun farkli uzunluklarda da false dondugunu kontrol eder.
    process.env.CRON_SECRET = 'short'
    expect(verifyCronSecret('a')).toBe(false)
    expect(verifyCronSecret('a-much-longer-attempt-string')).toBe(false)
    expect(verifyCronSecret(null)).toBe(false)
  })
})
