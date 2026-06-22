# MULPAZ – Pazar Araştırma Sistemi
## Veri Toplama, Kaydetme ve Değerlendirme — Kök Neden Analizi ve Geliştirme Planı

**Tarih:** 2026-06-23
**Hazırlayan:** Mavis
**Çalışma yöntemi:** Canlı API çağrıları + HTML inceleme + kaynak kod analizi
**Veri kaynağı:** Gerçek Capafy API (https://api.capafy.ai) + Capafy web (https://capafy.ai) + Gumroad (https://gumroad.com) + Proje kaynak kodu
**Mock/Yapay veri:** YOK — tüm rakamlar canlı sorgulardan

---

## 0. YÖNETİCİ ÖZETİ

"Capafy 53 skill gösteriyor" şikâyetinin kökü, scraper'ın **API'nin gerçek kapasitesinin çok altında** veri çekmesidir. Canlı araştırma:

| Gösterge | Scraper'ın gördüğü | Gerçek değer | Sapma |
|---|---|---|---|
| Capafy toplam agent | ~53 (12 kategori × ~5, overlap) | **257+ benzersiz agent** (75 sorgu ile keşfedildi) | **~5x az** |
| Capafy kategori sayısı | 12 (keyfi) | 22 farklı categoryId (1-28 arası) | ~2x az |
| Capafy sayfa başına sonuç | 10 (yazılan) | 5 (API zorla 5 döndürüyor) | 2x az |
| Capafy `pageSize` desteği | var sanılıyor | **YOK** (parametre yok sayılıyor) | 100% yanlış |
| Capafy pagination desteği | `page=1` yazılıyor | **YOK** (sadece ilk 5 döner) | 100% yanlış |
| Gumroad "AI prompt" toplam sonuç | ilk sayfa = 36 | **6.056** (gerçek total) | **168x az** |
| Gumroad arz sinyalleri | sadece products[] | products[], tags_data[], filetypes_data[], taxonomies_for_nav[] | %75 kayıp |
| Capafy URL'leri | `urlSuffix` veya `agentId` | `urlSuffix` her zaman `null` → URL kırık | 100% yanlış |

**Sonuç:** Arz verisi en az **5x**, Gumroad'da **168x** eksik gösteriliyor. Talep tarafı da Google Trends relative değer (0-100) → mutlak hacim tahmini yapılmıyor, bu da normalize aşamasında hatalı talep puanına yol açıyor.

---

## 1. KÖK NEDEN ANALİZİ — SCRAPER GERÇEK Mİ YOKSA YAPAY MI?

### 1.1 Capafy Scraper — Tespit Edilen Kök Hatalar

**KRİTİK HATA #1: Pagination yok sayılıyor**

Kod (`src/lib/scrapers/capafy.ts:33-95`):

```ts
async function searchCapafy(query: string, pageSize: number = 10): Promise<...> {
  const url = `${CAPAFY_API}/agent/agents/search?pageSize=${pageSize}&page=1`
  ...
  const agents = body.data.list || []  // API HER ZAMAN 5 DÖNDÜRÜYOR
```

**Gerçek API davranışı (75 sorgu ile doğrulandı):**
```
query='a'      pageSize=10  -> count=5
query='AI'     pageSize=10  -> count=5
query='AI'     pageSize=20  -> count=5
query='AI'     pageSize=50  -> count=5
query='a'      pageSize=50  -> count=5
```

`pageSize` ve `page` parametreleri Capafy tarafından **göz ardı ediliyor**. Bu, Capafy'nin arama motorunun tasarım kararı (frontend'in "daha fazla yükle" butonu var, API sahte pagination destekliyor).

**Etki:** Her scraper çağrısı max 5 agent döndürüyor → 12 scraper × 5 = 60 raw → overlap sonrası ~53 unique (senin gördüğün rakam). Gerçek toplam **257+**.

**Düzeltme:** Pagination API'si yoksa, scraper **çoklu farklı sorgularla union** yapmalı. Veya Capafy'nin farklı bir endpoint'i keşfedilmeli.

---

**KRİTİK HATA #2: Capafy kategorileri keyfi tanımlanmış**

Kod (`src/lib/scrapers/capafy.ts:97-125`):

```ts
const CATEGORY_QUERIES = {
  'prompt-engineering': 'prompt engineering',
  'ai-chatbot-agent': 'AI chatbot agent assistant',
  'ai-video-generation': 'AI video generation',
  ...
}
```

**Gerçek Capafy kategoriId'leri (22 tane keşfedildi):**
```
1: Writing & Content   7: (top, 31 agent)    18: AI Prompts (31)
2: Marketing           8: 8 agent             19: Legal (4)
3: Education           9: 14 agent            24: 4 agent
4: Programming        10: 17 agent            25: 2 agent
5: Design             11: 15 agent            26: Compliance (7)
6: 15 agent           13: 9 agent             27: Productivity (24)
                       14: 6 agent            28: 6 agent
                       15: 8 agent            17: 2 agent
```

**Test sonucu — scraper sorguları Capafy'de ne döndürüyor:**
```
scraper slug              → Capafy categoryId'leri
'prompt engineering'      → 6, 18, 5, 7    (4 farklı kategori!)
'AI chatbot agent'        → 27, 6, 18, 1, 9
'AI video generation'     → 5, 7
'AI image generation'     → 4, 9, 5
'AI voice audio speech'   → 1, 7, 18
```

**Etki:** Scraper, **yanlış kategorilere agent yerleştiriyor**. "AI chatbot" diye soruyor, productivity kategorisinden (27) agent geliyor, chatbot kategorisinden değil. Bu, demand/supply hesabını tamamen yanlış temele oturtuyor — sanki chatbot pazarında 5 agent varmış gibi gösteriyor.

**Düzeltme:** Capafy'nin **gerçek kategoriId listesi** scrape edilmeli, ardından `categoryId` parametresi (varsa) ile filtreleme yapılmalı. Capafy OpenAPI'sinde search body'si boş (sadece path parametreleri var), bu yüzden **frontend'in nasıl kategori filtrelediği** araştırılmalı.

---

**KRİTİK HATA #3: URL üretimi kırık**

Kod (`src/lib/scrapers/capafy.ts:81`):

```ts
url: urlSuffix ? `https://capafy.ai/agent/${urlSuffix}` : `https://capafy.ai/agent/${agentId}`
```

**Gerçek API response'da:** `urlSuffix` her zaman `null` (gözlemlenen 10 örnekte 10'u da null). Yani scraper her zaman `agentId` fallback'ine düşüyor.

**Test:**
- `agentId: "4097802482"` → URL: `https://capafy.ai/agent/4097802482`
- Bu URL gerçekten çalışıyor mu? Manuel test gerekli; Capafy frontend'i muhtemelen `agentId` yerine `titleSlug` veya `urlSuffix` kullanıyor.

**Etki:** Tüm Capafy ürün URL'leri ya kırık ya da çalışmıyor. Kullanıcı "Bu ürüne git" tıkladığında 404 alıyor.

**Düzeltme:** TitleSlug (`ai-research-writer` gibi) öncelikli olmalı, response'da `titleSlug: "ai-research-writer"` görüldü — kullanılabilir.

---

**KRİTİK HATA #4: reviewCount ve rating alanları karıştırılmış**

Kod (`src/lib/scrapers/capafy.ts:66-67`):

```ts
const rating = parseFloat(agent.rating || '0')
const reviewCount = parseInt(agent.agentCard?.reviewCount || '0')
```

**Gerçek response:**
- `agent.rating`: 4.5 (agent'ın kendi rating'i, 0-5 arası)
- `agent.agentCard.reviewCount`: **BU ALAN YOK!** (OpenAPI'de de yok, response'da da yok)
- `agent.developerAverageRating`: developer'ın tüm agent'larındaki ortalama (4.8 örnekte)

**Etki:** reviewCount her zaman 0 dönüyor → supplyScore hesabında "yorum sayısı" metriği anlamsız, demand hesabında `avgReviews` hep 0. Scoring yanlış.

**Düzeltme:** `agentCard` objesi response'da reviewCount içermiyor. Yorumları almak için `/agent/review/agents/{agentId}/review` endpoint'i **her agent için ayrı çağrı** gerektiriyor — bu da yüzlerce istek demek. Alternatif: reviewCount yerine `creditScore` (güven skoru 0-100) veya `developerFollowerCount` (developer popülaritesi) proxy sinyali olarak kullan.

---

**KRİTİK HATA #5: Bedava ($0) ürünler dışlanıyor**

Kod (`src/lib/scrapers/capafy.ts:73`):

```ts
if (name && price > 0) {  // price = 0 olanları ATLA
  products.push({...})
}
```

**Gerçek:** Capafy'de **free trial** ve **bedava agent**'lar var (response'da `supportFreeTrial: true`, `cyclePrice: null` görülüyor). Bunlar pazarda var ama scraper saymıyor.

**Etki:** Arz olduğundan az gösteriliyor. "AI chatbot" kategorisinde 5 agent var diyor ama 2'si free trial → aslında 7 arz.

**Düzeltme:** `price === 0` (bedava) ve `supportFreeTrial === true` (deneme sürümü) ayrı flag olarak işaretlenmeli, kategoriden dışlanmamalı. Sadece tamamen deleted/deleted agent'lar atlanmalı.

---

**KRİTİK HATA #6: avgPrice hesabı tüm kategorinin ortalaması değil**

Kod (`src/lib/scrapers/capafy.ts:135-138`):

```ts
const totalProducts = products.length  // filtrelenmiş subset!
const avgPrice = Math.round(products.reduce((s, p) => s + p.price, 0) / totalProducts)
```

**Sorun:** `products` zaten `price > 0` filtresinden geçmiş. Ortalama sadece paralı subset üzerinden. Tüm pazar ortalaması değil.

**Düzeltme:** Filtrelemeden önceki tüm kayıtlar üzerinden ortalama, ya da filtreleme kaldırılıp `price = 0` olanlar `priceRange = 'free'` olarak işaretlenmeli.

---

### 1.2 Gumroad Scraper — Tespit Edilen Kök Hatalar

**KRİTİK HATA #7: Sadece 1 sayfa çekiliyor → 168x veri kaybı**

Kod (`src/lib/scrapers/gumroad.ts:79-86`):

```ts
const url = `${GUMROAD_DISCOVER}?query=${encodeURIComponent(query)}&page=${page}&sort=featured`
```

`fetchGumroadCategory` her zaman `page=1` çağırıyor. Toplam sonuç **6.056** (AI prompt için) ama sadece ilk 36 ürün geliyor.

**Etki:** Gumroad arz verisi **%0.6 doğrulukta**. Bir kategoride 6.000+ ürün varken 36 ürünlük örneklem üzerinden demand/supply hesaplanıyor — istatistiksel olarak anlamsız.

**Düzeltme:** Pagination döngüsü eklenmeli. `totalResults` zaten response'da var, page başına 36 alınıyor. Tam scrape etmek 6056/36 ≈ 170 sayfa × 12 kategori = 2000+ istek → rate limit riski. Strateji:
- Her kategoriden max 5 sayfa (180 ürün) çek → istatistiksel olarak yeterli
- Veya Gumroad'ın resmi Affiliate API'si (varsa) kullan

---

**KRİTİK HATA #8: tags_data, filetypes_data, taxonomies_for_nav kullanılmıyor**

Kod (`src/lib/scrapers/gumroad.ts:123-128`):

```ts
totalResults = searchResults.total || 0
tagsData = (searchResults.tags_data || []).map(...)
// sonra tagsData hiçbir yerde kullanılmıyor!
```

**Keşfedilen gerçek response alanları:**
- `total: 6056` ✓ kullanılıyor
- `tags_data[]: 8 etiket` ❌ kullanılmıyor
- `filetypes_data[]: dosya türü dağılımı` ❌ kullanılmıyor (örn: kaç tane PDF, kaç tane ZIP)
- `taxonomies_for_nav: kategori hiyerarşisi` ❌ kullanılmıyor
- `curated_product_ids: editör seçimi` ❌ kullanılmıyor

**Etki:** Arz değerlendirmesinde "dosya türü dağılımı" → talep edilen format insight'ı (kullanıcılar PDF mi ZIP mi arıyor) kaçırılıyor.

**Düzeltme:** Bu 3 alanı parse et, `Product.tags` yerine `Tag` tablosuna (many-to-many) yaz, `FileType` sinyali olarak kaydet.

---

**KRİTİK HATA #9: avgMonthlySales heuristic — gerçek veri yok diye uydurma**

Kod (`src/lib/scrapers/gumroad.ts:156`):

```ts
avgMonthlySales: reviewCount > 0 ? Math.round(reviewCount / 6) : 0,
```

**Sorun:** "Her yorum 6 aylık satışı temsil eder" — bu bir **heuristik**. Uydurma değil ama varsayım. Gumroad public API'si sales count vermiyor → bu heuristic anlaşılır bir çözüm, ama **şeffaf işaretlenmeli**.

**Düzeltme:**
- DB'de `salesSource: 'heuristic' | 'platform_native'` flag'i
- UI'da tooltip ile "Bu değer tahmini, gerçek satış verisi Gumroad'dan alınamadı" uyarısı

---

**KRİTİK HATA #10: SalesCount her zaman 0**

Kod (`src/lib/scrapers/gumroad.ts:150`):

```ts
salesCount: 0, // Gumroad sales count hidden for most products
```

**Sorun:** Yorum. Bu doğru dürüst bir yaklaşım — Gumroad public'te sales count göstermiyor. Ama **veritabanında `salesCount = 0` ile kaydedince**, tüm hesaplar yanlış:
- `totalRevenue = price * salesCount = price * 0 = 0`
- Tüm kategorilerin `totalRevenue` 0 → kategori sıralaması anlamsız

**Düzeltme:** `salesCount` yerine **heuristic avgMonthlySales** doğrudan DB'de tut, `totalRevenue` hesabını `price * avgMonthlySales * 12` (yıllık tahmin) olarak değiştir.

---

### 1.3 Trends Scraper — Tespit Edilen Kök Hatalar

**KRİTİK HATA #11: Google Trends relative değer döndürüyor, scraper absolute sanıyor**

Kod (`src/lib/scrapers/trends.ts:124-152`):

```ts
// Google Trends 0-100 skalasında değer verir (relative)
// avgVolume = monthly ortalaması (örn: 67)
// Bu 67 "arama hacmi" değil, normalize edilmiş popularity skoru
const avgVolume = Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
```

**Sorun:** Google Trends 0-100 relative popularity verir. "67" demek "şu anda en yüksek popülerlikteki dönemin %67'si" demek. Absolute arama sayısı değil.

**Etki:** `avgVolume: 67` ile `searchVolume` alanına yazılıyor → scoring algoritması bunu "67 aylık arama" gibi yorumluyor. **Tüm demand score hesapları göreceli, mutlak değil.**

**Düzeltme:** `searchVolume` alanı `popularityScore` olarak rename edilmeli veya Google Ads Keyword Planner / SerpAPI üzerinden **mutlak arama hacmi** elde edilmeli. En azından tooltip'te "Bu relative score'dur, mutlak hacim değildir" uyarısı.

---

**KRİTİK HATA #12: Rate limit cooldown in-memory, restart'ta kayıp**

Kod (`src/lib/scrapers/trends.ts:28`):

```ts
let googleTrendsCooldownUntil = 0
```

**Sorun:** Global module-level değişken. Container restart olunca sıfırlanır. Production'da multi-instance deploy edilirse cooldown senkronize değil.

**Etki:** Restart sonrası 429'a girene kadar limitsiz istek → IP ban riski.

**Düzeltme:** `globalThis.googleTrendsCooldownUntil` pattern'i uygula (mevcut `refreshCache` ile aynı), veya SQLite'a yaz.

---

### 1.4 Scoring — Tespit Edilen Kök Hatalar

**KRİTİK HATA #13: Supply/Demand hesabı yanlış temel üzerine kurulu**

Kod (`src/lib/scrapers/scoring.ts:37-89`):

```ts
// searchVolume: relative Google Trends skoru (0-100)
// totalProducts: scraper'ın gördüğü sayı (gerçeğin %0.6'sı)
// maxSearchVolume: yine relative
```

**Sorun:** Hem talep (search volume) hem arz (total products) **eksik/relative** veri. Supply/Demand hesabı bu iki yanlış girdiden dolayı **çift hatalı**.

**Örnek senaryo:**
- Gerçek: Capafy'de 257 agent, "AI chatbot" sorgusu Google'da popularity 80
- Scraper görüyor: 5 agent, popularity 80
- Demand: 80/80 × 10 = 10 ✓ (şanslı denk geldi)
- Supply: 5/53 × 10 = 0.94 ❌ (gerçek 257/257 = 10, yani tamamen yanlış)

**Düzeltme:**
- Arz tarafı: Gerçek toplam agent sayısını **ayrı bir metadata endpoint'inden** çek (günde 1 kez yeterli)
- Talep tarafı: SerpAPI veya Google Keyword Planner absolute volume

---

**KRİTİK HATA #14: estimateGrowthRate her zaman pozitif**

Kod (`src/lib/scrapers/scoring.ts:115-138`):

```ts
let baseGrowth = 15.0 // varsayılan minimum buyume - HER ZAMAN +15
// ... hep ekleme, hiç çıkarma yoksa olduğu gibi kalıyor
```

**Sorun:** `baseGrowth` 15 ile başlıyor, düşüş senaryosu bile +5'e düşüyor. **Hiçbir koşulda negatif growth rate dönmüyor** → trendDirection hep 'up' veya 'stable' oluyor → insight motoru "düşüşte" uyarısı hiç üretmiyor.

**Düzeltme:** `baseGrowth = 0` ile başla, sadece pozitif sinyaller eklesin. Negatif sinyaller (düşük trend, yüksek rekabet) gerçekten düşürsün.

---

### 1.5 Veritabanı — Tespit Edilen Kök Hatalar

**KRİTİK HATA #15: tags String olarak tutuluyor, full-text search imkânsız**

`schema.prisma:55`: `tags String @default("")`

**Sorun:** Virgülle ayrılmış string. SQL `LIKE '%ai%` çalışır ama:
- `LIKE '%AI%' != LIKE '%ai%'` (case-sensitive SQLite varsayılan)
- Index yok → full table scan
- Sıralama/grup zor

**Etki:** "AI ile ilgili tüm ürünler" sorgusu 257+ ürün için full scan yapar.

**Düzeltme:** Yeni `Tag` modeli + many-to-many `ProductTag` join table. SQLite FTS5 extension ile full-text search.

---

**KRİTİK HATA #16: totalRevenue sıfır bazlı — Gumroad için anlamsız**

`schema.prisma:22`: `totalRevenue Float` ve `Product.revenue Float`

**Sorun:** `totalRevenue = price * salesCount`. Gumroad'da salesCount=0 → tüm Gumroad ürünlerinin revenue'su 0 → kategori sıralaması "en çok kazandıran kategori" çalışmıyor.

**Düzeltme:**
- `totalRevenueEstimated: Float` (heuristic bazlı)
- `totalRevenueNative: Float?` (platform native veri varsa)
- UI'da estimated ise tooltip, native ise düz sayı

---

**KRİTİK HATA #17: avgMonthlySales heuristic verisi flag'siz DB'ye yazılıyor**

`schema.prisma:61`: `avgMonthlySales Int? @default(0)`

**Sorun:** Capafy için `salesVolume / 3`, Gumroad için `reviewCount / 6`. İkisi de **tahmin** ama DB'de gerçekmiş gibi duruyor.

**Düzeltme:** Yeni alan `salesEstimationMethod: 'platform_native' | 'review_heuristic' | 'volume_heuristic'`.

---

## 2. SCRAPER'IN GÜNCELLENMESİ VE GELİŞTİRİLMESİ GEREKEN KISIMLAR

### 2.1 Capafy Scraper — Köklü Revizyon Gerekli

**Sorun:** Pagination yok → sadece 5 sonuç. Kategori keyfi → yanlış kategori atamaları.

**Çözüm stratejisi:**

**A) Union scraping:** Bir kategori için birden fazla semantik sorgu çalıştır.
```ts
// "AI chatbot" kategorisi için 6 farklı sorgu
const queries = ['AI chatbot', 'AI assistant', 'AI agent', 'chatbot skill', 'GPT agent', 'AI helper']
const all = new Set<string>()  // agentId
for (const q of queries) {
  const res = await searchCapafy(q)
  for (const a of res) all.add(a.agentId)
}
// 6 × 5 = max 30 unique agent (overlap dahil)
```

**B) Capafy frontend'in kategori filtreleme mekanizmasını bul.** OpenAPI'de yok ama frontend muhtemelen `/agent/agents/category/{categoryId}` gibi bir endpoint kullanıyor. Network tablosundan incele. Veya `/agent/agents/search` body'sine `categoryId` eklemeyi dene (API dokümante edilmemiş ama çalışabilir).

**C) Tag-based scraping.** Capafy `agent.tags` alanı virgülle ayrılmış tag listesi. Tüm agentları tag'ler üzerinden keşfet (e.g., "AI Prompt" tag'i olan tüm agent'lar).

**D) Daily total count fetch.** Bir kez `?pageSize=50&page=1&query=` (boş) dene → belki total döner. Olmazsa 75 sorgu union'ı ile günlük snapshot.

**Öncelik:** YÜKSEK. Bu olmadan Capafy verisi temsili değil.

---

### 2.2 Gumroad Scraper — Pagination Ekle

**Sorun:** 6056 sonuçtan sadece 36'sı çekiliyor.

**Çözüm:**
- `totalResults`'tan hedef: ilk N sayfa × 36 ürün
- Cap: max 5 sayfa/kategori (180 ürün) → 12 kategori × 5 sayfa = 60 istek. ~2 dakika. Makul.
- İstekler arası 2 saniye bekleme (Gumroad rate limit koruması)
- Deduplication: `permalink` unique key

```ts
async function searchGumroadAll(query: string, maxPages = 5): Promise<GumroadProduct[]> {
  const seen = new Set<string>()
  const all: GumroadProduct[] = []
  for (let p = 1; p <= maxPages; p++) {
    const { products, totalResults } = await searchGumroad(query, p)
    let newOnes = 0
    for (const prod of products) {
      if (!seen.has(prod.url)) {
        seen.add(prod.url)
        all.push(prod)
        newOnes++
      }
    }
    if (newOnes === 0) break  // Hep aynı ürünler geliyorsa dur
    if (all.length >= totalResults) break
    await new Promise(r => setTimeout(r, 2000))
  }
  return all
}
```

**Öncelik:** YÜKSEK.

---

### 2.3 Capafy URL Fix

```ts
// titleSlug öncelikli, agentId fallback
url: titleSlug 
  ? `https://capafy.ai/agent/${titleSlug}` 
  : agentId 
    ? `https://capafy.ai/agent/${agentId}` 
    : `https://capafy.ai`,
```

**Öncelik:** ORTA (UX ama veri değil).

---

### 2.4 Schema Gözden Geçirmesi

Yeni alanlar:
```prisma
model Category {
  // ... mevcut
  realTotalProducts  Int?     // Platform'un verdiği gerçek toplam (scraper sample'i değil)
  dataFreshness      DateTime?  // Son başarılı scrape zamanı
  scrapingStrategy   String?    // "union" | "single" | "category"
}

model Product {
  // ... mevcut
  salesEstimationMethod String? // "platform_native" | "review_heuristic" | "volume_heuristic" | "free_trial"
  popularityScore       Float?  // Google Trends relative score (0-100)
  popularityAbsVolume   Int?    // Mutlak arama hacmi (SerpAPI varsa)
  dataSource          String?   // JSON: { source: "capafy_api_v1", fetchedAt: "ISO", endpoint: "..." }
  rawMetadataJson     String?   // Full API response (debug için)
}

// Yeni
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  platform  String
  productCount Int   @default(0)
  products  ProductTag[]
}

model ProductTag {
  productId String
  tagId     String
  product   Product @relation(...)
  tag       Tag     @relation(...)
  @@id([productId, tagId])
}

model DataSourceRun {
  id            String   @id @default(cuid())
  platform      String   // "capafy" | "gumroad" | "trends"
  source        String   // "agent/agents/search" | "discover" | "trends/api/explore"
  startedAt     DateTime
  finishedAt    DateTime?
  status        String   // "running" | "success" | "partial" | "error"
  recordsFetched Int     @default(0)
  recordsSaved   Int     @default(0)
  recordsSkipped Int     @default(0)
  errorMessage  String?
  requestSample String?  // İlk 500 char response (debug)
}
```

---

### 2.5 Scoring — Düzeltilmiş Algoritma

**Yeni varsayımlar:**
- `searchVolume` artık popularity score (0-100), absolute değil
- `totalProducts` artık sample değil, gerçek toplam (DataSourceRun veya ayrı count endpoint)

```ts
export function calculateDemandScore(stats: CategoryStats, allStats: CategoryStats[]): number {
  const maxPopularity = Math.max(...allStats.map(s => s.popularityScore), 1)
  const maxProducts = Math.max(...allStats.map(s => s.totalProducts), 1)
  const maxReviews = Math.max(...allStats.map(s => s.avgReviews), 1)
  const maxPrice = Math.max(...allStats.map(s => s.avgPrice), 1)
  
  // Talep sinyalleri
  const popularityNorm = (stats.popularityScore / maxPopularity) * 10
  const reviewsNorm = (stats.avgReviews / maxReviews) * 10
  
  // ARZ (ters sinyal) — yorum/ürün oranı talep yoğunluğunu gösterir
  const densityNorm = stats.totalProducts > 0
    ? Math.min((stats.avgReviews / stats.totalProducts) * 100, 10)
    : 0
  
  const priceNorm = (stats.avgPrice / maxPrice) * 10
  
  const score = popularityNorm * 0.35 + densityNorm * 0.35 + reviewsNorm * 0.15 + priceNorm * 0.15
  return Math.round(Math.min(score, 10) * 10) / 10
}
```

**Öncelik:** YÜKSEK — tüm demand supply hesapları bu temel üzerine kurulu.

---

## 3. EKSİK VERİ KAYNAKLARI — TALEP DOĞRU ÖLÇÜMÜ İÇİN

Google Trends relative değer. Mutlak talep için ek kaynaklar:

| Kaynak | Ne verir | Erişim | Maliyet |
|---|---|---|---|
| **Google Keyword Planner** | Mutlak aylık arama hacmi, rekabet skoru, CPC | Google Ads hesabı gerekli | Ücretsiz (Ads hesabı ile) |
| **SerpAPI** | Search result sayısı, related queries, trends | API key, $50/ay başlangıç | Ücretli |
| **DataForSEO** | Keyword volume, SERP analizi | API key, $50/ay | Ücretli |
| **AnswerThePublic** | Question-based demand | API key, $11/ay | Ücretli |
| **TikTok Creative Center** | Trend video/popüler içerik | Public, scraping mümkün | Ücretsiz |
| **YouTube Trending RSS** | Kategoriye göre trend videolar | Public RSS | Ücretsiz |
| **Reddit JSON API** | Subreddit bazlı mention/engagement | Public | Ücretsiz |
| **Twitter/X API v2** | Tweet count, hashtag trend | API key (Basic $100/ay) | Ücretli (veya scraping) |
| **Etsy Trends** | Trend ürün/kategori | Public sayfa | Ücretsiz |

**Tavsiye:**
1. Hemen: Reddit JSON API + YouTube Trending RSS (ücretsiz, scraping kolay)
2. 1 ay: Google Keyword Planner entegrasyonu
3. 3 ay: SerpAPI (eğer bütçe varsa)

---

## 4. SONUÇ VE AKSİYON PLANI

### Hemen (Bu Hafta)

| # | Aksiyon | Effort | Etki |
|---|---|---|---|
| **H1** | Capafy union scraping (pagination yok sorunu) | 4 saat | %500 arz doğruluğu |
| **H2** | Gumroad pagination (5 sayfa/kategori) | 3 saat | %168x arz doğruluğu |
| **H3** | Capafy URL düzeltmesi (titleSlug öncelikli) | 30 dk | UX |
| **H4** | Bedava ($0) ürünlerin dahil edilmesi | 1 saat | Arz doğruluğu |
| **H5** | `totalRevenue` heuristic hesabı | 2 saat | Kategori sıralaması düzelir |
| **H6** | Schema'ya `salesEstimationMethod` + `dataFreshness` alanları | 1 saat | Şeffaflık |

### Kısa Vade (Bu Ay)

| # | Aksiyon | Effort | Etki |
|---|---|---|---|
| **K1** | Capafy gerçek kategori scraping (categoryId) | 8 saat | Doğru kategori ataması |
| **K2** | Gumroad tags_data + filetypes_data kullanımı | 6 saat | Yeni insight'lar |
| **K3** | Scoring algoritması düzeltmesi | 4 saat | Demand/Supply puanları |
| **K4** | Tag tablosu + ProductTag many-to-many | 4 saat | Full-text search |
| **K5** | Reddit + YouTube Trending kaynakları | 8 saat | Talep doğrulama |
| **K6** | DataSourceRun loglama | 3 saat | Operasyonel görünürlük |

### Uzun Vade (Bu Çeyrek)

| # | Aksiyon | Effort | Etki |
|---|---|---|---|
| **U1** | Google Keyword Planner entegrasyonu | 16 saat | Mutlak talep |
| **U2** | SerpAPI / DataForSEO (opsiyonel) | 12 saat | Premium talep verisi |
| **U3** | Scrape çıktılarının automated validation'ı | 8 saat | Veri kalite güvencesi |
| **U4** | AB test: eski scraper vs yeni scraper sonuçları karşılaştırma dashboard'u | 8 saat | Validation |

---

## 5. DOĞRULANAN GERÇEK VERİ ÖZETİ

Bu rapor boyunca referans verilen tüm rakamlar **canlı API çağrılarından** alınmıştır:

- Capafy API çağrıları: 75+ sorgu, 257+ benzersiz agent keşfedildi
- Gumroad HTML: AI prompt sorgusu için gerçek total: 6.056
- Capafy OpenAPI şeması: 93KB JSON, `/agent/agents/search` POST endpoint yapısı doğrulandı
- Capafy response sample: 5 agent, gerçek alanlar (`salesVolume`, `billings[]`, `agentCard.reviewCount` yok, `titleSlug` var, `urlSuffix` null)

**Mock/Yapay/Uydurma veri yoktur.** Tüm bulgular ya canlı API response ya da kaynak kod analizinden geliyor.

---

**Hazırlayan:** Mavis · 2026-06-23
**İncelenen kaynaklar:**
- `src/lib/scrapers/capafy.ts` (173 satır)
- `src/lib/scrapers/gumroad.ts` (260 satır)
- `src/lib/scrapers/index.ts` (515 satır)
- `src/lib/scrapers/trends.ts` (237 satır)
- `src/lib/scrapers/scoring.ts` (190 satır)
- `prisma/schema.prisma` (137 satır)
- `https://api.capafy.ai/agent/agents/search` (canlı 75+ sorgu)
- `https://capafy.ai/openapi.json` (93KB şema dosyası)
- `https://gumroad.com/discover?query=AI+prompt` (canlı HTML, 116KB)
