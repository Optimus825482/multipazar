import { describe, it, expect } from 'vitest'
import { safeNum, safeDivide, safeAverage, formatCurrency, formatCount, getProductCount, getOverviewCount, calcGapScore, enrichProductWithRevenue } from '@/data/helpers'

describe('helpers - safe math', () => {
  describe('safeNum', () => {
    it('returns number if finite', () => {
      expect(safeNum(5)).toBe(5)
      expect(safeNum(0)).toBe(0)
      expect(safeNum(-3.14)).toBe(-3.14)
    })

    it('returns fallback for NaN/Infinity', () => {
      expect(safeNum(NaN)).toBe(0)
      expect(safeNum(Infinity)).toBe(0)
      expect(safeNum(-Infinity)).toBe(0)
      expect(safeNum(NaN, 10)).toBe(10)
    })

    it('returns fallback for non-number', () => {
      expect(safeNum('foo' as any)).toBe(0)
      expect(safeNum(null as any)).toBe(0)
      expect(safeNum(undefined as any)).toBe(0)
      expect(safeNum({} as any)).toBe(0)
    })
  })

  describe('safeDivide', () => {
    it('divides correctly', () => {
      expect(safeDivide(10, 2)).toBe(5)
      expect(safeDivide(0, 5)).toBe(0)
    })

    it('returns fallback on division by zero', () => {
      expect(safeDivide(10, 0)).toBe(0)
      expect(safeDivide(10, 0, -1)).toBe(-1)
    })

    it('returns fallback for non-finite inputs', () => {
      expect(safeDivide(NaN, 5)).toBe(0)
      expect(safeDivide(10, NaN)).toBe(0)
      expect(safeDivide(Infinity, 5)).toBe(0)
    })
  })

  describe('safeAverage', () => {
    it('returns average of values', () => {
      expect(safeAverage([1, 2, 3, 4, 5])).toBe(3)
      expect(safeAverage([10])).toBe(10)
    })

    it('filters out non-finite values', () => {
      expect(safeAverage([1, NaN, 2, Infinity, 3])).toBe(2)
    })

    it('returns fallback for empty array', () => {
      expect(safeAverage([])).toBe(0)
      expect(safeAverage([], -1)).toBe(-1)
    })
  })
})

describe('helpers - formatters', () => {
  describe('formatCurrency', () => {
    it('formats billions', () => {
      expect(formatCurrency(1_500_000_000)).toBe('$1.5B')
    })

    it('formats millions', () => {
      expect(formatCurrency(2_300_000)).toBe('$2.3M')
    })

    it('formats thousands', () => {
      expect(formatCurrency(15_000)).toBe('$15.0K')
    })

    it('formats small numbers', () => {
      expect(formatCurrency(500)).toBe('$500')
    })

    it('handles invalid input', () => {
      expect(formatCurrency(NaN)).toBe('$0')
    })
  })

  describe('formatCount', () => {
    it('formats without currency prefix', () => {
      expect(formatCount(1_500_000_000)).toBe('1.5B')
      expect(formatCount(2_300_000)).toBe('2.3M')
      expect(formatCount(15_000)).toBe('15.0K')
      expect(formatCount(500)).toBe('500')
    })

    it('handles invalid input', () => {
      expect(formatCount(NaN)).toBe('0')
    })
  })
})

describe('helpers - counts', () => {
  describe('getProductCount', () => {
    it('returns totalProducts when present', () => {
      expect(getProductCount({ totalProducts: 100 })).toBe(100)
    })

    it('falls back to totalCourses (Udemy legacy)', () => {
      expect(getProductCount({ totalCourses: 50 })).toBe(50)
    })

    it('prefers totalProducts over totalCourses', () => {
      expect(getProductCount({ totalProducts: 100, totalCourses: 50 })).toBe(100)
    })

    it('returns 0 for empty', () => {
      expect(getProductCount({})).toBe(0)
    })
  })

  describe('getOverviewCount', () => {
    it('works on null/undefined', () => {
      expect(getOverviewCount(null)).toBe(0)
      expect(getOverviewCount(undefined)).toBe(0)
    })

    it('returns totalProducts or fallback', () => {
      expect(getOverviewCount({ totalProducts: 200 })).toBe(200)
      expect(getOverviewCount({ totalCourses: 75 })).toBe(75)
    })
  })
})

describe('helpers - calculations', () => {
  describe('calcGapScore', () => {
    it('returns positive when demand > supply', () => {
      expect(calcGapScore(8, 3)).toBe(5)
    })

    it('returns negative when supply > demand', () => {
      expect(calcGapScore(3, 8)).toBe(-5)
    })

    it('rounds to 1 decimal', () => {
      expect(calcGapScore(7.55, 3.21)).toBe(4.3)
    })
  })

  describe('enrichProductWithRevenue', () => {
    it('calculates revenue from price * salesCount', () => {
      const result = enrichProductWithRevenue({ price: 10, salesCount: 100 })
      expect(result.revenue).toBe(1000)
    })

    it('preserves existing revenue if present', () => {
      const result = enrichProductWithRevenue({ price: 10, salesCount: 100, revenue: 5000 })
      expect(result.revenue).toBe(5000)
    })

    it('uses studentCount as fallback for sales', () => {
      const result = enrichProductWithRevenue({ price: 50, studentCount: 200 })
      expect(result.revenue).toBe(10000)
    })

    it('always calculates opportunityScore', () => {
      const result = enrichProductWithRevenue({
        price: 10,
        salesCount: 100,
        demandScore: 8,
        supplyScore: 3,
      })
      expect(typeof result.opportunityScore).toBe('number')
      expect(result.opportunityScore).toBeGreaterThan(0)
    })
  })
})
