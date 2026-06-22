-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "avgPrice" REAL NOT NULL,
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "totalCourses" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL,
    "totalStudents" INTEGER,
    "searchVolume" INTEGER NOT NULL,
    "demandScore" REAL NOT NULL,
    "supplyScore" REAL NOT NULL,
    "competitionIndex" REAL NOT NULL,
    "growthRate" REAL NOT NULL,
    "trendDirection" TEXT NOT NULL DEFAULT 'up',
    "avgRating" REAL,
    "avgReviews" INTEGER,
    "realTotalProducts" INTEGER,
    "sampleSize" INTEGER,
    "platformCategoryId" TEXT,
    "dataFreshness" DATETIME,
    "scrapingStrategy" TEXT,
    "revenueEstimationMethod" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "studentCount" INTEGER,
    "revenue" REAL NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "searchVolume" INTEGER DEFAULT 0,
    "demandScore" REAL NOT NULL,
    "supplyScore" REAL NOT NULL,
    "opportunityScore" REAL NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "seller" TEXT,
    "instructor" TEXT,
    "creator" TEXT,
    "type" TEXT NOT NULL DEFAULT 'other',
    "avgMonthlySales" INTEGER DEFAULT 0,
    "avgMonthlyEnroll" INTEGER,
    "priceRange" TEXT NOT NULL DEFAULT 'mid',
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "gumroadUrl" TEXT,
    "salesEstimationMethod" TEXT,
    "popularityScore" REAL,
    "platformProductId" TEXT,
    "titleSlug" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "hasFreeTrial" BOOLEAN NOT NULL DEFAULT false,
    "dataSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "categoryId" TEXT,
    "impactScore" REAL NOT NULL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SearchTrend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "categorySlug" TEXT,
    "month" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "growthRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefreshLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefreshJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "message" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "docCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "tagId"),
    CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSourceRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsSaved" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "requestSample" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrendingSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "categorySlug" TEXT,
    "keyword" TEXT NOT NULL,
    "signalSource" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" REAL NOT NULL,
    "rawJson" TEXT,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductIdea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "estimatedPrice" REAL NOT NULL,
    "estimatedMonthlySales" INTEGER NOT NULL DEFAULT 0,
    "estimatedMonthlyEnroll" INTEGER,
    "estimatedMonthlyRevenue" REAL NOT NULL DEFAULT 0,
    "demandScore" REAL NOT NULL,
    "supplyScore" REAL NOT NULL,
    "gapScore" REAL NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Orta',
    "timeToCreate" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_platform_slug_key" ON "Category"("platform", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SearchTrend_platform_keyword_month_key" ON "SearchTrend"("platform", "keyword", "month");

-- CreateIndex
CREATE INDEX "RefreshJob_status_platform_idx" ON "RefreshJob"("status", "platform");

-- CreateIndex
CREATE INDEX "RefreshJob_createdAt_idx" ON "RefreshJob"("createdAt");

-- CreateIndex
CREATE INDEX "Tag_platform_idx" ON "Tag"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_platform_name_key" ON "Tag"("platform", "name");

-- CreateIndex
CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- CreateIndex
CREATE INDEX "DataSourceRun_platform_startedAt_idx" ON "DataSourceRun"("platform", "startedAt");

-- CreateIndex
CREATE INDEX "TrendingSignal_platform_signalSource_observedAt_idx" ON "TrendingSignal"("platform", "signalSource", "observedAt");

-- CreateIndex
CREATE INDEX "TrendingSignal_categorySlug_idx" ON "TrendingSignal"("categorySlug");
