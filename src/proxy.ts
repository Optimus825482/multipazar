/**
 * Proxy - API route'lari icin rate limiting ve guvenlik basliklari.
 *
 * Simdilik rate limiting (IP tabanli in-memory) uygulanmistir.
 * Uretimde Redis tabanli cozum onerilir (upstash/upstash-rate-limiter).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Basit in-memory rate limiter (single-instance icin yeterli)
// Multi-instance load balancer altinda Redis kullanilmali.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Temizlik: her 5 dakikada bir eski kayitlari sil
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

function getRateLimiter(limit: number, windowMs: number) {
  return (ip: string): { allowed: boolean; remaining: number; resetAt: number } => {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
    }

    entry.count++
    if (entry.count > limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt }
    }

    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
  }
}

const apiLimiter = getRateLimiter(100, 60 * 1000) // 100 istek/dakika
const refreshLimiter = getRateLimiter(5, 60 * 1000) // 5 istek/dakika refresh endpoint

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sadece API route'larina rate limit uygula
  if (pathname.startsWith('/api/')) {
    // IP adresini al (proxy arkasinda X-Forwarded-For kullan)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'

    // Refresh endpointi icin daha agresif limit
    const isRefresh = pathname === '/api/refresh'
    const limiter = isRefresh ? refreshLimiter : apiLimiter
    const result = limiter(ip)

    const response = NextResponse.next()

    // Rate limit headers
    response.headers.set('X-RateLimit-Limit', String(isRefresh ? 5 : 100))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Cok fazla istek. Lutfen bekleyin.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
