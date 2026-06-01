-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "marketplaces" TEXT[],
    "filters" JSONB NOT NULL,
    "sort" TEXT NOT NULL DEFAULT 'best_value',
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "discountPercent" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "sellerName" TEXT,
    "sellerRating" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "productUrl" TEXT NOT NULL,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "deliveryInfo" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreReasons" TEXT[],
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "oldPrice" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "imageUrl" TEXT,
    "productUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedProduct" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION,
    "lastPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "trackedProductId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParserLog" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "searchId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParserLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Search_userId_createdAt_idx" ON "Search"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_searchId_score_idx" ON "Offer"("searchId", "score");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_productUrl_key" ON "Favorite"("userId", "productUrl");

-- CreateIndex
CREATE INDEX "TrackedProduct_userId_idx" ON "TrackedProduct"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedProduct_userId_productUrl_key" ON "TrackedProduct"("userId", "productUrl");

-- CreateIndex
CREATE INDEX "PriceHistory_trackedProductId_recordedAt_idx" ON "PriceHistory"("trackedProductId", "recordedAt");

-- CreateIndex
CREATE INDEX "ParserLog_marketplace_createdAt_idx" ON "ParserLog"("marketplace", "createdAt");

-- AddForeignKey
ALTER TABLE "Search" ADD CONSTRAINT "Search_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedProduct" ADD CONSTRAINT "TrackedProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_trackedProductId_fkey" FOREIGN KEY ("trackedProductId") REFERENCES "TrackedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
