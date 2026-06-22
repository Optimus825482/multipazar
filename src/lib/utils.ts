import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Category, Product, PlatformData } from '@/types'

export const CHART_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f43f5e', '#a855f7', '#14b8a6', '#eab308', '#3b82f6', '#22c55e', '#6366f1']

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1000000000) return `$${(n / 1000000000).toFixed(1)}B`
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

export function formatCount(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n.toLocaleString()
}

export function safeNum(n: any, fallback: number = 0): number {
  return typeof n === 'number' && isFinite(n) ? n : fallback
}

export function getProductCount(c: any): number {
  return safeNum(c.totalProducts || c.totalCourses)
}

export function getOverviewCount(overview: any): number {
  return safeNum(overview?.totalProducts || overview?.totalCourses)
}

export interface PlatformConfig {
  name: string
  color: string
  gradient: string
  label: string
  productLabel: string
  salesLabel: string
  api: string
}

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  gumroad: { name: 'Gumroad', color: '#f97316', gradient: 'from-orange-500 to-amber-500', label: 'Dijital Urun', productLabel: 'Urun', salesLabel: 'Satis', api: '/api/market' },
  capafy: { name: 'Capafy AI', color: '#06b6d4', gradient: 'from-cyan-500 to-teal-500', label: 'AI Skill', productLabel: 'Skill', salesLabel: 'Satis', api: '/api/capafy' },
}
