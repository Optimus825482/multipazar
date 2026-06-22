import { timingSafeEqual } from 'crypto'

/**
 * Güvenlik yardımcıları - hassas işlem yetkilendirme katmanı.
 *
 * Cron tabanli ve admin islemlerinde kullanilan secret dogrulama.
 * Constant-time karsilastirma yapar (timing attack onleme).
 */

/**
 * Iki string'i sabit zamanli karsilastirir.
 * Farkli uzunlukta olsalar bile ayni surede doner (length leak onleme).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aBytes = Buffer.from(a, 'utf-8')
  const bBytes = Buffer.from(b, 'utf-8')

  if (aBytes.length !== bBytes.length) {
    // Uzunluk farki olsa bile karsilastirma yap ki sure tutarli olsun
    timingSafeEqual(aBytes, aBytes)
    return false
  }

  return timingSafeEqual(aBytes, bBytes)
}

/**
 * Cron secret dogrulamasi yapar.
 *
 * GUVENLIK KURALLARI:
 * - Secret ayarli OLMALIDIR (yoksa islem reddedilir)
 * - Header GONDERILMELIDIR (yoksa reddedilir - onceki !authHeader acigi kapatildi)
 * - Karsilastirma constant-time yapilir
 *
 * @returns true ise yetkili, false ise reddedilmeli
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  const expected = process.env.CRON_SECRET

  // Secret ayarli degilse - henuz yapilandirilmamis, reddet
  if (!expected) {
    return false
  }

  // Header yoksa - yetkisiz
  if (!authHeader) {
    return false
  }

  return timingSafeEqualString(authHeader, expected)
}
