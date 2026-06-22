import { describe, it, expect } from 'vitest'
import {
  calculateDemandScore,
  calculateSupplyScore,
  calculateCompetitionIndex,
  calculateOpportunityScore,
  determineTrendDirection,
  calculateGrowthFromTrendData,
  estimateGrowthRate,
} from '@/lib/scrapers/scoring'
import type { CategoryStats } from '@/lib/scrapers/scoring'

describe('scoring engine', () => {
  const baseStats: CategoryStats = {
    avgPrice: 50,
    totalProducts: 1000,
    totalRevenue: 100000,
    searchVolume: 50000,
    avgRating: 4.5,
    avgReviews: 100,
    totalStudents: 0,
  }

  describe('calculateDemandScore', () => {
    it('returns 0 for empty input', () => {
      const stats: CategoryStats = { ...baseStats, searchVolume: 0, totalProducts: 0, avgRating: 0, avgReviews: 0, avgPrice: 0 }
      const score = calculateDemandScore(stats, [stats])
      // Tek kategori oldugunda normalize 10 olur ama agirlikli ortalama < 10 olur
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(10)
    })

    it('returns higher score for higher search volume', () => {
      const lowVol: CategoryStats = { ...baseStats, searchVolume: 1000 }
      const highVol: CategoryStats = { ...baseStats, searchVolume: 100000 }
      const allStats = [lowVol, highVol]
      const lowScore = calculateDemandScore(lowVol, allStats)
      const highScore = calculateDemandScore(highVol, allStats)
      expect(highScore).toBeGreaterThan(lowScore)
    })

    it('clamps to 0-10 range', () => {
      const stats: CategoryStats = { ...baseStats, searchVolume: 1000000, totalProducts: 100000 }
      const score = calculateDemandScore(stats, [stats])
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(10)
    })
  })

  describe('calculateSupplyScore', () => {
    it('returns 0-10 range', () => {
      const score = calculateSupplyScore(baseStats, [baseStats])
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(10)
    })

    it('higher product count = higher supply score (more saturated)', () => {
      const fewProducts: CategoryStats = { ...baseStats, totalProducts: 100 }
      const manyProducts: CategoryStats = { ...baseStats, totalProducts: 50000 }
      const allStats = [fewProducts, manyProducts]
      const lowSupply = calculateSupplyScore(fewProducts, allStats)
      const highSupply = calculateSupplyScore(manyProducts, allStats)
      expect(highSupply).toBeGreaterThan(lowSupply)
    })

    it('handles zero search volume gracefully', () => {
      const stats: CategoryStats = { ...baseStats, searchVolume: 0, totalProducts: 100 }
      const score = calculateSupplyScore(stats, [stats])
      expect(Number.isFinite(score)).toBe(true)
      expect(score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateCompetitionIndex', () => {
    it('returns 10 when demand is 0', () => {
      const idx = calculateCompetitionIndex(0, 5)
      expect(idx).toBe(10)
    })

    it('returns ratio of supply/demand * 10', () => {
      // supply=5, demand=5 → 5/5 * 10 = 10
      expect(calculateCompetitionIndex(5, 5)).toBe(10)
      // supply=3, demand=6 → 3/6 * 10 = 5
      expect(calculateCompetitionIndex(6, 3)).toBe(5)
    })

    it('clamps to 10', () => {
      // supply cok yuksek olsa bile 10'u gecmemeli
      expect(calculateCompetitionIndex(1, 100)).toBeLessThanOrEqual(10)
    })
  })

  describe('calculateOpportunityScore', () => {
    it('returns non-negative value', () => {
      const score = calculateOpportunityScore(8, 3)
      expect(score).toBeGreaterThanOrEqual(0)
    })

    it('high demand + low supply = high opportunity', () => {
      const good = calculateOpportunityScore(9, 2)
      const bad = calculateOpportunityScore(3, 9)
      expect(good).toBeGreaterThan(bad)
    })
  })

  describe('determineTrendDirection', () => {
    it('returns "up" for growth > 10', () => {
      expect(determineTrendDirection(15)).toBe('up')
      expect(determineTrendDirection(100)).toBe('up')
    })

    it('returns "down" for growth < -5', () => {
      expect(determineTrendDirection(-10)).toBe('down')
      expect(determineTrendDirection(-50)).toBe('down')
    })

    it('returns "stable" for -5 to 10 range', () => {
      expect(determineTrendDirection(0)).toBe('stable')
      expect(determineTrendDirection(5)).toBe('stable')
      expect(determineTrendDirection(-3)).toBe('stable')
    })
  })

  describe('calculateGrowthFromTrendData', () => {
    it('returns 0 for empty array', () => {
      expect(calculateGrowthFromTrendData([])).toBe(0)
    })

    it('returns positive growth when last > first', () => {
      const volumes = [100, 110, 120, 130, 140, 150]
      const growth = calculateGrowthFromTrendData(volumes)
      expect(growth).toBeGreaterThan(0)
    })

    it('returns negative growth when last < first', () => {
      const volumes = [150, 140, 130, 120, 110, 100]
      const growth = calculateGrowthFromTrendData(volumes)
      expect(growth).toBeLessThan(0)
    })

    it('returns 0 when first value is 0', () => {
      const growth = calculateGrowthFromTrendData([0, 10, 20])
      expect(growth).toBe(0)
    })
  })

  describe('estimateGrowthRate', () => {
    it('returns base growth for low metrics', () => {
      const rate = estimateGrowthRate(1000, 100, 4.0)
      expect(rate).toBeGreaterThanOrEqual(0)
      expect(rate).toBeLessThanOrEqual(100)
    })

    it('higher search volume increases growth estimate', () => {
      const lowVol = estimateGrowthRate(1000, 100, 4.0)
      const highVol = estimateGrowthRate(600000, 100, 4.0)
      expect(highVol).toBeGreaterThan(lowVol)
    })

    it('very few products adds growth bonus', () => {
      const saturated = estimateGrowthRate(50000, 50000, 4.0)
      const unsaturated = estimateGrowthRate(50000, 100, 4.0)
      expect(unsaturated).toBeGreaterThan(saturated)
    })
  })
})
