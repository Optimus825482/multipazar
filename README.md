# MULPAZ — Multi-Pazar Analiz Pro

**Gumroad + Capafy AI** pazaryerlerini kıyaslamalı analiz eden Next.js dashboard uygulaması. Gerçek scraper verileri + Google Trends ile talep/arz/fırsat analizi sunar.

> **Not:** Udemy desteği ToS riski nedeniyle kaldırıldı (bakınız `docs/DECISION_LOG.md`).

## Özellikler

- 📊 **2 Pazaryeri Kıyası:** Gumroad dijital ürünler + Capafy AI skill pazarı
- 🔄 **Otomatik Yenileme:** Her 6 saatte bir cron + manuel POST
- 📈 **Talep/Arz Skorlama:** Google Trends verisi ile normalize edilmiş 0-10 skorlar
- 🎯 **Fırsat Analizi:** Gap score (demand - supply) ile kategori fırsatları
- 🔍 **Çapraz Pazar:** İki platformda da güçlü talep gören konular
- 🛡️ **Güvenlik:** Cron secret (timing-safe), Origin allowlist, rate limiting, CSP, zod input validation
- 💾 **Veri Bütünlüğü:** SQLite WAL + atomik transaction, uydurma fallback yok

## Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 16.1 (App Router, Turbopack) |
| UI | React 19, Tailwind 4, shadcn/ui (Radix), Recharts |
| Veritabanı | Prisma 6 + SQLite (WAL mode) |
| Veri Toplama | Cheerio (Gumroad Inertia JSON), fetch (Capafy API), Google Trends unofficial API |
| Runtime | Bun 1 + standalone Next.js output |
| Container | Docker multi-stage (oven/bun:1-slim) |
| Test | Vitest |

## Hızlı Başlangıç

### Geliştirme

```bash
# 1. Bağımlılıkları kur
bun install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env icindeki CRON_SECRET icin rastgele bir deger uret:
openssl rand -hex 32

# 3. Veritabanini olustur
bun run db:push

# 4. (Opsiyonel) Seed verisi yukle
bun run scripts/seed.ts

# 5. Dev server baslat
bun run dev
# http://localhost:3000
```

### Production (Docker)

```bash
# CRON_SECRET'i host'ta set et
export CRON_SECRET=$(openssl rand -hex 32)

# Build + run
docker compose up -d

# Health check
curl http://localhost:3000/api/health
```

## Çevre Değişkenleri

`.env` dosyasında:

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DATABASE_URL` | Prisma SQLite dosya yolu | `file:./mulpaz.db` |
| `CRON_SECRET` | `/api/refresh` POST endpoint secret (rastgele 32+ byte hex) | zorunlu |
| `NEXT_PUBLIC_BASE_URL` | Origin allowlist için public URL | `http://localhost:3000` |

## API Endpoints

| Method | Path | Açıklama |
|--------|------|----------|
| `GET` | `/api/market` | Gumroad platform verisi (kategoriler, ürünler, trendler, içgörüler) |
| `GET` | `/api/capafy` | Capafy AI platform verisi |
| `GET` | `/api/compare` | 2 platform kıyası (radyal chart, fırsatlar, güçlü yönler) |
| `GET` | `/api/products?platform=gumroad&page=1&limit=20` | Ürün listesi (sayfalama, filtreleme) |
| `GET` | `/api/categories?platform=gumroad` | Kategori listesi |
| `GET` | `/api/trends?platform=gumroad` | Google Trends verisi (aylık) |
| `GET` | `/api/insights?platform=gumroad` | Pazar içgörüleri |
| `GET` | `/api/opportunities` | Yüksek talep/düşük arz fırsatları |
| `GET` | `/api/dashboard` | Özet dashboard |
| `GET` | `/api/refresh` | Sistem durumu + son refresh |
| `GET` | `/api/refresh?jobId=...` | Job durumu (polling) |
| `POST` | `/api/refresh` | Manuel refresh tetikleme (auth gerekli) |
| `GET` | `/api/health` | Health check (DB, cache, uptime) |

### POST /api/refresh Authorization

İki yöntemden biri:
1. `x-cron-secret: <CRON_SECRET>` header
2. `Origin: <NEXT_PUBLIC_BASE_URL>` (allowlist)

## Mimari Kararlar

### Veri Bütünlüğü
- Scraping başarısız olursa **uydurulmuş fallback KULLANILMAZ** — kategori atlanır.
- Atomic transaction: sil + yeniden yaz, hata olursa eski veri korunur.
- WAL mode SQLite + `busy_timeout` = es zamanlı okuma/yazma güvenli.

### Neden Udemy Yok?
Udemy Genel Şartları otomatik scraping'i yasaklıyor. Puppeteer ile Cloudflare korumasını aşmaya çalışmak hukuki risk taşıyordu + Docker imajı 1.5 GB'a çıkıyordu. Çıkarıldı. (bakınız `docs/DECISION_LOG.md`)

### Güvenlik Katmanları
1. **Network:** Cloudflare/proxy arkasında çalıştırılmalı
2. **Headers:** `X-Frame-Options: DENY`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`
3. **Rate Limiting:** 100 req/dk genel, 20 req/dk refresh (in-memory)
4. **Auth:** `x-cron-secret` (timing-safe) + Origin allowlist
5. **Validation:** zod ile tüm query/body inputları
6. **DB:** Prisma prepared statements (SQL injection riski düşük)

## Veri Akışı

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Cron (6 saat)  │───▶│  scrapers/*.ts   │───▶│  Prisma → SQLite │
│  POST /refresh  │    │  (Gumroad+Capafy)│    │  (transactional) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   page.tsx      │◀───│   /api/*         │◀───│  Cache (5 dk)   │
│   (Dashboard)   │    │   (helpers.ts)   │    │  (lib/cache.ts) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Geliştirme Komutları

```bash
bun run dev              # Next.js dev (Turbopack)
bun run build            # Production build + Prisma generate
bun run start            # Standalone production server
bun run lint             # ESLint
bun run type-check       # tsc --noEmit
bun run db:push          # Schema → SQLite
bun run db:migrate       # Prisma migrate dev
bun run test             # Vitest (unit testler)
```

## Deployment

Multi-stage Dockerfile:
1. **Builder stage:** `oven/bun:1` — `bun install`, `prisma generate`, `next build`
2. **Runtime stage:** `oven/bun:1-slim` — standalone çıktı + Prisma client + startup script

Non-root kullanıcı (`appuser`), SQLite `/data` volume'da persist edilir.

## Test

```bash
bun run test           # Tüm testler (Vitest, watch mode)
bun run test:run       # Tek seferlik calistir
```

Test coverage:
- `src/lib/scrapers/scoring.ts` — Talep/arz/rekabet hesaplama
- `src/lib/auth.ts` — Timing-safe secret verification
- `src/data/helpers.ts` — Güvenli sayı/bölme/ortalama
- `src/lib/cache.ts` — In-memory cache TTL

## Monitoring

- `/api/health` — DB + cache + uptime (200 OK / 503 degraded)
- Refresh log + RefreshJob tabloları (DB)
- Console log (stdout → Docker logs)

## Bilinen Sınırlar

- **Single-instance:** Rate limit + cache in-memory. Çoklu instance için Redis gerekli.
- **Google Trends unofficial API:** Google isteğe bağlı kapatabilir/değiştirebilir. Yedek kaynak: SerpAPI.
- **SQLite production:** Çok yüksek eş zamanlı yazma için PostgreSQL'e migrate edilmeli.

## Lisans

Private.
