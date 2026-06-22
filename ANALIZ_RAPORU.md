# MULPAZ – Multi-Pazar Analiz Pro
## Uygulama İnceleme, Hata Tespiti ve Geliştirme Raporu

**Tarih:** 2026-06-22
**Versiyon:** 0.2.0 (worklog.md)
**Stack:** Next.js 16.1.1 · React 19 · TypeScript 5 · Tailwind 4 · Prisma 6.11.1 · SQLite · Puppeteer 25 · Recharts 2.15

---

## 1. Projenin Mevcut Durumu (Özet)

**MULPAZ**, 3 dijital pazaryerini (Gumroad, Udemy, Capafy AI) kıyaslamalı analiz eden bir Next.js dashboard uygulaması. Ana akış:

- **UI:** Tek `page.tsx` (1033 satır) içinde 4 sekme (Gumroad / Udemy / Capafy / Compare) ve her birinin 6 alt sekmesi (Dashboard / Kategoriler / Ürünler / Fırsatlar / Trendler / İçgörüler).
- **Veri toplama:** Puppeteer + cheerio + axios tabanlı scraper'lar (`src/lib/scrapers/`), Google Trends ve Capafy API.
- **Veri saklama:** Prisma + SQLite, atomik transaction ile her 6 saatte bir yenileme (cron) veya manuel POST.
- **API:** `/api/market`, `/api/udemy`, `/api/capafy`, `/api/compare`, `/api/products`, `/api/categories`, `/api/insights`, `/api/opportunities`, `/api/trends`, `/api/refresh`, `/api/dashboard`, `/api/route`.
- **Güvenlik:** `src/proxy.ts` rate limiter, `src/lib/auth.ts` cron secret (timing-safe), Next.js security headers, zod input validation.
- **Build:** Multi-stage Dockerfile + Bun runtime + standalone Next output + Prisma client.

Teknik borç ve kalite açısından iyi işlenmiş ama birkaç kritik güvenlik/performans/UX sorunu var. Aşağıda detaylıca.

---

## 2. KRİTİK HATALAR (Acil Düzeltilmeli)

### 🔴 H1 – `app/page.tsx` 1033 satır, "use client" monolitik yapı
- **Dosya:** `src/app/page.tsx`
- **Sorun:** Tüm sayfa, alt componentler, tip tanımları, format helper'ları tek dosyada. "use client" olduğu için TÜM recharts, tüm iconlar, tüm UI bileşenleri initial bundle'a giriyor. 60+ component import'u tek dosyada.
- **Etki:** Bundle şişmesi, kod bakımı zorlaşıyor, HMR yavaş, re-render sorunları.
- **Çözüm:** `MarketplaceContent`, `CompareTab`, `Header`, `Footer`, `ScoreBadge`, `formatNumber`/`formatCount` zaten ayrı dosyalarda mevcut ama kullanılmıyor. page.tsx'i < 200 satıra indir, diğer her şeyi `/src/app/page.tsx` yerine `/src/components/marketplace/`, `/src/lib/formatters/` gibi alt klasörlere dağıt.
- **Öncelik:** Yüksek (ama acil değil – functional değil, kalite sorunu).

### 🔴 H2 – Cross-origin POST'ta rate-limit/auth header'ları nasıl yorumlanıyor belirsiz
- **Dosya:** `src/app/api/refresh/route.ts:48-56`, `src/proxy.ts`
- **Sorun:**
  - `verifyCronSecret(authHeader) && !isSameOriginRequest(request)` – yani **same-origin ise secret YOKSA bile geçiyor**. Browser, fetch'e otomatik cookie/Origin header ekler ama bir Node script'i tek satırda `fetch('/api/refresh', {method:'POST'})` çağırırsa Origin header'ı host'a eşit geliyorsa bypass edebilir.
  - Browser tarafında `origin` header her zaman var; headless/Node tarafında manipülasyonu kolay.
- **Etki:** Yetkisiz kişi refresh tetikleyebilir (rate limit 20/dk var ama yine de kötüye kullanılabilir, scraper işlemlerini tetikleyip bant genişliği harcatır).
- **Çözüm:** Same-origin kontrolü yerine `Origin` header'ı allowlist (sadece `NEXT_PUBLIC_BASE_URL` veya `localhost:3000`) ile karşılaştır. Veya refresh için secret'ı zorunlu tut, sadece `/api/refresh?key=CRON_SECRET` gibi query token'a izin ver.
- **Öncelik:** Orta-Yüksek.

### 🔴 H3 – In-memory cache + rate limiter + cron cooldown restart'ta sıfırlanıyor
- **Dosya:** `src/lib/scrapers/trends.ts:28-37`, `src/app/api/*/route.ts` (5+ yerde), `src/proxy.ts:13-23`, `src/lib/scrapers/index.ts:529`
- **Sorun:** `Map` ve `setInterval` global memory'de tutuluyor. Next.js standalone modda her restart'ta cache sıfırlanır; Google Trends 429 cooldown unutulur, rate limit sayaçları temizlenir. Çoklu instance scale edilemez.
- **Etki:** Rate limit aşımı, Google Trends 429'a girip 15dk beklenmesi gereken durumda taze istek yapılması, cache tutarsızlığı.
- **Çözüm:**
  - Rate limit: Redis (`@upstash/ratelimit`) veya en azından `globalThis` üzerinden persist et (mevcut `globalThis.refreshCache` pattern'ını uygula).
  - Google Trends cooldown: SQLite'a veya `RefreshJob` tablosuna yaz.
  - API cache: Redis veya Next.js `unstable_cache`.
- **Öncelik:** Orta (tek instance'ta çalışıyorsa tolere edilebilir, ama production'da sorun).

### 🔴 H4 – Puppeteer + Chromium Docker imajı 1.5 GB+
- **Dosya:** `Dockerfile:22`
- **Sorun:** `apt-get install -y chromium` ile tüm Chromium bağımlılıkları kuruluyor (~250MB) + Puppeteer'in kendi chromium'u (~170MB, `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` sayesinde skip ediliyor) + Bun runtime. Resim ~1.2-1.5 GB civarı.
- **Etki:** Cold start yavaş, registry/deploy süresi uzun, depolama maliyeti yüksek.
- **Çözüm:**
  - Sadece Udemy için Puppeteer kullanılıyor. Gumroad Inertia API ve Capafy public API'sini Puppeteer olmadan fetch ile çekiyorsun (doğru bir karar).
  - Alternatif: `puppeteer-core` + `@sparticuz/chromium` (serverless için ~50MB, AWS Lambda uyumlu). Veya `playwright` 1.40+ ile aynı sonuç, image 1/3 boyutunda.
  - Daha radikal: Udemy'yi tamamen scraper'dan çıkar, public API'si olan bir kaynağa (ClassCentral, Udemy public search sayfası HTML scrape) yönlendir.
- **Öncelik:** Düşük-Orta (Puppeteer şu an çalışıyor, image iyileştirme).

### 🔴 H5 – Cache Map leak riski: `cleanup interval` ama restart'ta kayıp + scoped yok
- **Dosya:** `src/proxy.ts:13-23`, `src/lib/scrapers/trends.ts` `googleTrendsCooldownUntil`
- **Sorun:** `setInterval` modül yüklenince bir kez başlıyor; Next.js dev mode'da HMR ile her değişiklikte yeni interval başlıyor, eskileri GC olmayabilir → memory leak.
- **Etki:** Dev ortamında yavaşlama, production'da edge case.
- **Çözüm:** Interval'i module-level guard ile tek seferlik yap (`if (globalThis.__cleanupInterval) return`).
- **Öncelik:** Düşük.

### 🟠 H6 – Refresh POST'ta "jobId döndükten sonra background refresh başlıyor" ama client 5 sn sabit bekliyor
- **Dosya:** `src/app/page.tsx:697-703`
- **Sorun:** `setTimeout(..., 5000)` sabit bekleme. Gerçek refresh 30-120 sn sürebiliyor (3 platform × Puppeteer × Trends). 5 sn sonra UI hâlâ eski veriyi gösteriyor.
- **Çözüm:** SSE (Server-Sent Events) veya polling endpoint'i (`/api/refresh/status?jobId=...`) ile job tamamlanınca tetikle.
- **Öncelik:** Orta (UX sorunu).

### 🟠 H7 – ESLint `@typescript-eslint/no-explicit-any: warn` – sayfalarca any kullanılıyor
- **Dosya:** `src/app/api/compare/route.ts:36-74`, `src/app/page.tsx:113-133, 839+`, `src/lib/scrapers/index.ts:78-104`
- **Sorun:** Tip güvenliği zayıf; `any` her yerde. Refactor ve IDE desteği zayıf.
- **Çözüm:** `strict` modunu Prisma generated types ile sıkılaştır, generic wrapper'lar yaz. Refactor opportunity: `PlatformData<C, P>` generic type.
- **Öncelik:** Düşük-Orta (uzun vadeli kalite).

### 🟠 H8 – `Math.random` üretimden kaldırılmış ama unique ID'ler `cuid()` ile tutarlı, prod'da tekrar kontrol gerekli
- **Sorun:** Prisma `@default(cuid())` zaten güvenli, Math.random yok. Ancak bazı yerlerde `key={i}` (array index) kullanılıyor (`page.tsx:780, 854, 994`). Liste reorder olursa React yanlış DOM elemanlarını reuse eder.
- **Çözüm:** Stabil key'ler: `key={p.id || p.url || p.name}`.
- **Öncelik:** Düşük ama iyi pratik.

---

## 3. EKSİKLER (Olması Gereken Ama Yok)

### ⚠️ E1 – Test coverage sıfır
- **Dosya:** `src/__tests__/` klasörü **boş**
- **Sorun:** Hiç unit/integration/E2E test yok. `package.json`'da test script'i yok. `vitest`/`jest`/`@testing-library` kurulu değil.
- **Risk:** Refactor güvensiz, regression'lar anlaşılmıyor.
- **Çözüm (öncelik sırasıyla):**
  1. `vitest` kurulumu (Jest ile uyumlu API, esbuild ile hızlı)
  2. `src/lib/scrapers/scoring.ts` için unit test (saf fonksiyonlar, kolay)
  3. `src/lib/auth.ts` timing-safe test
  4. `src/data/helpers.ts` `safeNum`, `safeDivide`, `safeAverage`, `buildTrendDataFromDB` test
  5. API route'ları için integration test (MSW ile fetch mock'la)
  6. Playwright ile E2E: login yok ama dashboard render + refresh click test edilebilir.
- **Öncelik:** Yüksek (yazılım kalitesinin temel taşı).

### ⚠️ E2 – Logging & monitoring yok
- **Sorun:** Sadece `console.log/error`. Üretimde ne hata aldığını görmek için imkansız.
- **Çözüm:**
  - Yapısal loglama: `pino` veya Next.js'in built-in `instrumentation` (mevcut dosya sadece cron başlatıyor).
  - Hata tracking: Sentry (Next.js için `@sentry/nextjs` paketi var).
  - Metrikler: `/api/metrics` Prometheus endpoint'i veya OpenTelemetry.
- **Öncelik:** Orta.

### ⚠️ E3 – OpenAPI / API docs yok
- **Sorun:** 11 API endpoint var, hepsi undocumented. Frontend geliştirici / 3rd-party entegrasyon için tek kaynak kod.
- **Çözüm:** `next-swagger-doc` veya `zod-to-openapi` ile şema üret, `/api/docs` route'unda Swagger UI sun.
- **Öncelik:** Düşük (iç kullanım).

### ⚠️ E4 – Health check & readiness endpoint yok
- **Sorun:** Docker/orchestrator'lar için `/api/health` yok. DB bağlantısı, cache durumu kontrol edilmiyor.
- **Çözüm:**
  ```
  GET /api/health → { db: 'ok', cache: 'ok', lastRefresh: ISO, uptime: ms }
  ```
- **Öncelik:** Orta (container orchestration için gerekli).

### ⚠️ E5 – CI/CD pipeline yok
- **Sorun:** `.github/workflows/`, `.gitlab-ci.yml`, vb. yok. Build/test manual.
- **Çözüm:** GitHub Actions ile `bun install → type-check → lint → test → build → docker build` workflow'u.
- **Öncelik:** Orta.

### ⚠️ E6 – Yetkilendirme / kimlik doğrulama yok
- **Sorun:** Refresh ve veri görüntüleme herkese açık. Cron secret sadece /api/refresh için.
- **Değerlendirme:** Uygulama public pazaryeri analiz aracı, auth gerekli olmayabilir – bu bir karar. Ama scrape tetikleyebilen birinin kaynak tüketmesi söz konusu. Şu an rate limit + cron secret yeterli görünüyor.
- **Öncelik:** Düşük (tasarım kararı, duruma göre değişir).

### ⚠️ E7 – SEO / metadata eksik
- **Sorun:** `app/layout.tsx` sadece title/description/icon. OpenGraph, Twitter cards, structured data yok.
- **Çözüm:**
  - `metadata` API ile `openGraph`, `twitter`, `robots`, `alternates`.
  - `app/sitemap.ts` ve `app/robots.ts` Next.js 13+ özelliği.
  - JSON-LD: `WebApplication` schema.
- **Öncelik:** Düşük (in-house tool görünüyor, ama public landing'e çıkarsa önemli).

### ⚠️ E8 – i18n kısmen var ama eksik
- **Durum:** UI Türkçe, ama içeride bazı yerlerde İngilizce fallback string'ler var (`'Yukleniyor...'`, `'Veri yenileme basladi'`). Sistem locale `tr_TR`, `lang="tr"` doğru ayarlanmış.
- **Çözüm:** Tüm string'leri `messages/tr.json` ve `messages/en.json`'a taşı, `next-intl` ile dil değiştirme.
- **Öncelik:** Düşük.

### ⚠️ E9 – Refresh sonrası UI'ın refresh'in bitmesini beklemesi için SSE/polling yok
- **Sorun:** `setTimeout(5000)` magic number (H6 ile aynı konu). Kullanıcı deneyimi kötü.
- **Öncelik:** Orta.

### ⚠️ E10 – `/api/route.ts` (app/api altında direkt) ne işe yarıyor belirsiz
- **Dosya:** `src/app/api/route.ts` 134 byte – muhtemelen yanlışlıkla oluşturulmuş veya test amaçlı. İçeriği kontrol edilmeli.
- **Öncelik:** Düşük (muhtemelen silinmeli).

### ⚠️ E11 – Seed.ts dosyası PostgreSQL için yazılmış ama DB SQLite
- **Dosya:** `scripts/seed.ts:6` "Seeding database for PostgreSQL..."
- **Sorun:** Script SQLite'a bağlanıyor (Prisma provider SQLite), ama yorum PostgreSQL diyor. Schema SQLite. Kafa karıştırıcı.
- **Ayrıca:** `package.json`'da `"db:migrate": "prisma migrate dev"`, `"db:reset": "prisma migrate reset"` var ama `prisma/migrations/` klasörü yok – yani **hiç migration oluşturulmamış**. Schema sadece `db push` ile push'lanıyor.
- **Risk:** Production'da schema değişiklikleri takip edilemez.
- **Çözüm:**
  - `prisma migrate dev --name init` ile ilk migration'ı oluştur.
  - Seed.ts'teki yanlış yorumu düzelt.
- **Öncelik:** Orta.

### ⚠️ E12 – `__tests__/` klasörü boş ve README'de bahsi yok
- Bakınız E1.

### ⚠️ E13 – `Puppeteer` ile Udemy scraping kurumsal ToS ihlali riski
- **Sorun:** Udemy'nin Genel Şartları (Terms of Service) otomatik scraping'i yasaklıyor. Cloudflare koruması var (kod `await page.goto(UDEMY_BASE)` ile bypass etmeye çalışıyor). Yasal risk var.
- **Çözüm:**
  - Sadece public RSS/API kaynaklarına yönel: ClassCentral API (varsa), Udemy'in kendi affiliate API'si (gelir paylaşımı programı), CourseAPI.io gibi 3rd party.
  - Veya statik + periyodik güncelleme: "Live scraping yok, günde 1 kez manuel seed" gibi dürüst bir politika.
- **Öncelik:** Yüksek (hukuki risk).

---

## 4. GÜVENLİK ANALİZİ

### ✅ İyi Yapılanlar
- `src/lib/auth.ts` – `timingSafeEqual` (Node `crypto`) ile constant-time karşılaştırma ✓
- Secret yoksa tüm istekleri reddet ✓
- `headers()` ile `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-DNS-Prefetch-Control` ✓
- `proxy.ts` rate limiting (100/dk genel, 20/dk refresh) ✓
- `zod` input validation (`/api/products`) ✓
- Prisma prepared statements (SQL injection riski düşük) ✓
- `docker-compose.yaml`'da `CRON_SECRET` zorunlu (`:?` syntax) ✓

### ⚠️ Riskler

1. **H2** – same-origin bypass (yukarıda)
2. **CRON_SECRET rotation yok** – secret sızdığında manuel müdahale gerekir.
   - Çözüm: Secret rotation periyodu + DB'ye değil env'e yaz (zaten öyle).
3. **`process.env.CRON_SECRET` undefined davranışı** – auth.ts doğru reddediyor ama log yok.
   - Çözüm: `console.warn` ile "CRON_SECRET not configured" logla (production'da görünür olsun).
4. **SQLite DB dosyası container içinde** (`/data/mulpaz.db`). Volume mount var (`mulpaz-data:/data`) ama container root olarak çalışıyor olabilir.
   - Çözüm: Dockerfile'da `USER node` veya dedicated user ekle.
5. **CORS policy yok** – aynı origin varsayımı var ama explicit CORS header set edilmiyor. Same-origin browser fetch'leri çalışır, 3rd-party client'lar için net değil.
6. **CSP (Content Security Policy) header yok** – XSS koruması zayıf. `next.config.ts`'e CSP ekle.
7. **`dangerouslySetInnerHTML`** – `src/components/ui/chart.tsx:83` shadcn/ui Recharts entegrasyonunda var; Recharts SVG ürettiği için genelde güvenli ama review edilmeli.

---

## 5. PERFORMANS

### 🟢 İyi Yapılanlar
- WAL mode SQLite (`db.ts:14-22`) ✓
- `createMany` batch insert (`scrapers/index.ts:368`) ✓
- API-level cache (5dk / 15dk) ✓
- Atomik transaction (`scrapers/index.ts:282-396`) ✓
- Sequential platform refresh (SQLite write lock'a saygı) ✓

### ⚠️ İyileştirme Alanları

1. **API cache invalidation:**
   - Refresh sonrası cache temizleniyor (`refresh.ts:14-21`) ama tutarsız: `cron.ts:30` global cache'i temizlerken `/api/compare` route'unun kendi lokal cache'i var. İkisi senkron değil.
   - Çözüm: Tek bir `globalThis.refreshCache` Map'e geç (mevcut pattern).

2. **`Promise.all` 3 API fetch (page.tsx:651-655):**
   - 5sn response süresi + 3 API paralel = UI loading 5sn+
   - Çözüm: Streaming + Suspense ile ilk platform verisi gelince render et.

3. **`RefreshProgress` `setInterval` 300ms:**
   - Her 300ms state update → re-render. 60+ component tree. CPU yükü.
   - Çözüm: CSS-only animasyon veya `requestAnimationFrame`.

4. **Bundle size:**
   - 50+ shadcn/ui component hepsi `components/ui/` altında var ama hepsi kullanılmıyor olabilir. `react-day-picker`, `react-syntax-highlighter`, `vaul`, `cmdk`, `input-otp`, `embla-carousel-react` gibi import edilmeyen ama bundle'a giren paketler olabilir.
   - Çözüm: `@next/bundle-analyzer` ile gerçek durumu gör, tree-shake edilemeyenleri çıkar.

5. **Recharts her render'da yeniden layout:**
   - 5-6 grafik aynı anda. ResponsiveContainer yüksekliği değiştiğinde layout thrash.
   - Çözüm: Sabit aspectRatio veya memoize.

---

## 6. KOD KALİTESİ & BAKIM

### ⚠️ Tekrarlı / Refactor Edilebilir

1. **Cache boilerplate 5 dosyada kopyalanmış** (`market/route.ts`, `udemy/route.ts`, `capafy/route.ts`, `compare/route.ts`):
   ```ts
   const cache = new Map<string, { data: unknown; timestamp: number }>()
   function getCached(...) {...}
   function setCache(...) {...}
   const globalCache = globalThis as unknown as {...}
   if (!globalCache.refreshCache) globalCache.refreshCache = cache as any
   ```
   - Çözüm: `src/lib/cache.ts` ortak modül.

2. **API route'lar response shape aynı ama her birinde tekrar:**
   - `overview`, `categories`, `topCategories`, `fastestGrowing`, `lowestCompetition`, `topProducts`, `trendingProducts`, `opportunities`, `insights`, `trends`, `lastUpdated`
   - Çözüm: `src/lib/api/buildPlatformResponse.ts` ortak builder.

3. **Üç API'de `categoryOpportunities` hesabı farklı eşiklerle** (market: supply ≤ 5.5, udemy: 6.5, capafy: 3.5). Tutarsız.
   - Çözüm: Konfigürasyona taşı veya tek algoritma.

4. **2 tip tanım dosyası** – `src/types/index.ts` ve `src/data/types.ts` (neredeyse aynı).
   - Çözüm: Birleştir, `src/types/` canonical olsun.

5. **`PLATFORM_CONFIG` 2 yerde** – `src/app/page.tsx:172-176` ve `src/data/types.ts:149-180`.
   - Çözüm: Tek dosya.

6. **`MarketplaceContent` ve `CompareTab` neredeyse aynı UI**:
   - `src/app/page.tsx:191-637` ve `src/components/dashboard/CompareTab.tsx`.
   - Header + Footer + Compare Tab page.tsx içinde inline, CompareTab.tsx ayrı.
   - Çözüm: page.tsx'i sadece orchestration'a indir, UI'ı component'lere dağıt.

### ⚠️ Type Safety

- `src/lib/scrapers/index.ts` `ScrapedProduct` interface'i var ama scraper fonksiyonlar farklı şekilde döndürüyor (Gumroad vs Capafy: `seller` vs `creator`). Union type ile düzeltilebilir.
- `(window as any).__refreshProgress` global mutable state. Context API veya callback ref'e çevir.

### ⚠️ Error Handling

- API route'larında `try/catch` var ama sadece `console.error` + 500. Production'da hangi hata olduğu bilinmez.
- Cron job hataları sadece log, kullanıcıya bildirim yok.
- Çözüm: Sentry + toast notification.

### ⚠️ Yorum & Dokümantasyon

- Çoğu dosya İngilizce/Türkçe karışık yorum içeriyor. Tutarlı ol.
- JSDoc çoğu yerde iyi (özellikle scoring.ts, db.ts). Ama `seed.ts`'de yanlış bilgi var ("PostgreSQL" yazıyor).
- `README.md` yok! Onboarding için kritik.

---

## 7. SCRAPER GÜVENİLİRLİĞİ

### 🟢 Doğru Kararlar
- Puppeteer sadece Udemy için (Gumroad Inertia JSON + Capafy REST API yeterli) ✓
- Rate limit (Google Trends 429 → 15dk cooldown) ✓
- Hata olursa uydurma fallback yok, kategori ATLANIYOR (`scrapers/index.ts:241-245`) ✓ – **Bu mükemmel bir karar, dürüst veri.**
- `salesCount: 0` (Gumroad için) → reviews/6 → avgMonthlySales (heuristic). Şeffaf bir yaklaşım.

### ⚠️ Kırılgan Noktalar

1. **Gumroad `data-page` JSON selector:**
   - HTML yapısı değişirse kırılır. Şu an `props.search_results.products[]` parse ediliyor.
   - Çözüm: Daha robust CSS selector veya alternatif: `gumroad.com/discover?query=...` RSS feed.

2. **Udemy Puppeteer selectors (`udemy.ts:99-106`):**
   - `[class*="course-card"]` çok gevşek, yanlış elementleri yakalayabilir.
   - `[data-purpose="..."]` data-purpose attribute'ları Udemy rebrand'lerinde değişebilir.
   - Çözüm: `data-testid` veya sabit class'lar (Udemy'de yok ama API response daha güvenilir).

3. **Google Trends unofficial API:**
   - `trends.google.com/trends/api/explore` private API. Google istediği zaman kapatır/değiştirir.
   - Çözüm: Yedek kaynak – `SerpAPI`, `DataForSEO`, `pyTrends` (Python). Veya manual upload pipeline (csv json).

4. **Capafy POST API yapısı:**
   - `agent/agents/search` body'de JSON, query string'de `pageSize`. Kırılgan.
   - Çözüm: API response contract'ı dokümante et, schema validation ekle.

5. **Inertia version selector:**
   - `gumroad.ts:50-65` – meta tag veya data-page attribute. Hangisi stabil?
   - Çözüm: Error case'lerde retry/backoff ekle.

---

## 8. UI/UX

### 🟢 İyi
- Mobile-first responsive (`worklog.md` Task 4'te belirtildiği gibi) ✓
- Inline style ile platform renkleri (Tailwind JIT sorunu çözülmüş) ✓
- shadcn/ui tutarlı component library ✓
- Dark mode `next-themes` ile var (`layout.tsx:32-35`) ama `defaultTheme="light"` – test edilmemiş olabilir.
- Son güncelleme zamanı gösteriliyor ✓

### ⚠️ Sorunlar
1. **`not-found.tsx` ve `error.tsx` minimal** – branding yok.
2. **404 sayfası "Sayfa Bulunamadi"** – tutarlı ama logo/styling eksik.
3. **Skeleton loading yok** – sadece spinner. Büyük data set için iskelet ekle.
4. **Empty state yok** – refresh başarısız olunca sadece eski data + toast. "Veri bulunamadı, yenile" CTA ekle.
5. **Accessibility:**
   - Renk kontrastı (skor badge'leri `text-red-600 bg-red-50`) – WCAG AA uyumlu mu kontrol et.
   - Keyboard navigation test edilmemiş.
   - ARIA labels eksik (Radar chart, vs.)
6. **`Suspense` / streaming yok** – her şey client-side, initial HTML boş.
7. **Font:** `Inter` Google Fonts'tan. Self-host ederseniz LCP iyileşir.
8. **Image optimization:** `/logo.png` direkt kullanılıyor, `next/image` yok. LCP için `<Image>` kullan.

---

## 9. DATABASE & SCHEMA

### 🟢 İyi
- İndeks: `RefreshJob.status, platform` ve `createdAt` ✓
- WAL mode ✓
- `cuid` ID'ler ✓
- Nullable opsiyonel alanlar doğru ✓

### ⚠️ İyileştirme
1. **`SearchTrend` için index yok** – `(platform, keyword, month)` unique ama `(platform, categorySlug)` lookup için index eksik olabilir.
2. **`Product.tags String`** – virgülle ayrılmış string. SQL `LIKE '%foo%'` performansı düşük.
   - Çözüm: SQLite `JSON` veya separate `Tag` tablosu (many-to-many).
3. **`Category` description TEXT** – çoğu 50-100 char, TEXT fazla ama SQLite'ta sorun yok.
4. **Migration history yok** (E11).
5. **Backup strategy belirsiz** – SQLite production'da nasıl yedekleniyor?
   - Çözüm: `litestream` ile S3'e otomatik WAL streaming.
6. **`totalStudents?: Int` – Udemy-specific, diğerleri null** – polymorphic anti-pattern. Çözüm: ayrı `UdemyCategoryStats` tablosu veya `Json` alan.

---

## 10. DEPLOYMENT & DevOps

### ⚠️ Eksikler
1. **CI/CD pipeline** (E5).
2. **`.dockerignore` 206 byte** – çok kısa. `.env`, `.next`, `node_modules`, `coverage`, `.git` doğru ignore edilmiş mi?
3. **Multi-arch build yok** – `linux/amd64` default. Apple Silicon / ARM desteği?
4. **Container health check** yok (E4 ile bağlantılı).
5. **Logging stratejisi** – `bun server.js` stdout/stderr Docker logs'a düşer ama aggregation (Loki, CloudWatch) ayarlı değil.
6. **Reverse proxy varsayımı** – Cloudflare/proxy arkasında X-Forwarded-For güvenilir mi?
   - `proxy.ts:54-56` X-Forwarded-For'ı kullanıyor; production'da reverse proxy IP spoofing'e açık.
   - Çözüm: `request.ip` veya trusted proxy chain validation.
7. **`NEXT_PUBLIC_BASE_URL`** sadece UI'da kullanılıyor, server-side fetch'lerde yok.

---

## 11. ÖNCELİKLENDİRİLMİŞ EYLEM PLANI

### 🔥 Acil (Bu Hafta)
| # | Aksiyon | Effort | Etki |
|---|---------|--------|------|
| A1 | H2 – Same-origin bypass kapat (Origin allowlist) | 1 saat | Yüksek güvenlik |
| A2 | E13 – Udemy scraping ToS risk değerlendirmesi | 2 saat | Yasal koruma |
| A3 | E11 – İlk Prisma migration oluştur | 30 dk | Veri bütünlüğü |
| A4 | H6/E9 – SSE veya polling ile refresh progress iyileştir | 3 saat | UX |
| A5 | E1 – İlk unit testler (scoring, helpers, auth) | 4 saat | Kalite temeli |

### 🟡 Kısa Vade (Bu Ay)
| # | Aksiyon | Effort | Etki |
|---|---------|--------|------|
| B1 | H1 – page.tsx refactor (component'lere dağıt) | 8 saat | Bakım |
| B2 | Cache helper refactor (ortak modül) | 2 saat | DRY |
| B3 | Health check endpoint (E4) | 1 saat | Orchestration |
| B4 | README.md oluştur (kurulum, env, deploy) | 2 saat | Onboarding |
| B5 | CSP header ekle | 1 saat | XSS koruması |
| B6 | E2 – Sentry / pino logging | 3 saat | Operasyonel görünürlük |
| B7 | Bundle analyzer ile gereksiz paketleri çıkar | 2 saat | Performance |
| B8 | `/api/route.ts` sil veya işlevini belgele | 10 dk | Temizlik |
| B9 | Dockerfile USER directive (non-root) | 30 dk | Güvenlik |
| B10 | Image optimization (`next/image`) | 2 saat | LCP |

### 🟢 Uzun Vade (Bu Çeyrek)
| # | Aksiyon | Effort | Etki |
|---|---------|--------|------|
| C1 | E1 – Full test coverage (%70+) | 20 saat | Refactor güvenliği |
| C2 | E5 – CI/CD pipeline | 8 saat | Kalite |
| C3 | E3 – OpenAPI/Swagger docs | 6 saat | DX |
| C4 | i18n (next-intl) | 8 saat | Çoklu dil |
| C5 | Redis-backed rate limit + cache (multi-instance) | 6 saat | Ölçeklenebilirlik |
| C6 | Docker image optimizasyonu (Playwright/alpine) | 8 saat | Deploy süresi |
| C7 | ESEO (OpenGraph, sitemap, structured data) | 4 saat | Keşfedilebilirlik |
| C8 | Type safety sıkılaştırma (any → generic) | 16 saat | Bakım |

---

## 12. GENEL DEĞERLENDİRME

**Güçlü Yönler:**
- Veri bütünlüğü konusunda dürüst (uydurma veri yok, "veri yoksa kategori atlanır")
- Atomik transaction + WAL mode ile veri tutarlılığı
- Güvenlik temel katmanı iyi (timing-safe auth, rate limiting, headers)
- shadcn/ui + Tailwind 4 ile modern UI
- Responsive tasarım düzgün
- Worklog.md ile geliştirme süreci belgelenmiş

**Kritik Açıklar:**
- **H2 güvenlik bypass** ve **E13 ToS riski** acilen ele alınmalı
- **Sıfır test coverage** – her refactor risk
- **`page.tsx` monolitik yapı** – büyümeyi sınırlıyor
- **Migration history eksik** – production schema değişikliği tehlikeli

**Skor:** 6.5/10
- İşlevsellik: 9/10 (çalışıyor, doğru veri)
- Güvenlik: 6/10 (temel korumalar var ama H2)
- Performans: 7/10 (iyi optimizasyonlar ama bundle şişkin)
- Bakım: 5/10 (monolitik page.tsx, duplicate cache code, type weak)
- Test: 1/10 (sıfır test)
- Dokümantasyon: 5/10 (kod içi iyi, README yok)

**Sonuç:** Uygulama fonksiyonel olarak güçlü, veri yaklaşımı dürüst ve modern mimari kararları iyi. Acil güvenlik (H2, E13) ve temel test altyapısı (E1) eklendiğinde production-grade olur. Monolitik page.tsx ve duplicate kod pattern'leri orta vadede refactor edilmeli.

---

**Raporu hazırlayan:** Mavis · 2026-06-22
**İncelenen commit/branch:** main (en son commit `tsbuildinfo 22.06.2026 12:46`)
**Toplam analiz edilen dosya sayısı:** 30+ (sayfa, API, scraper, config)
**Toplam satır sayısı:** ~2500+ TypeScript/TSX
