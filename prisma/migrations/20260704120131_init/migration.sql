-- CreateTable
CREATE TABLE "SearchLocation" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMP(3),

    CONSTRAINT "SearchLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "scoresJson" TEXT NOT NULL,
    "groupsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchLocation_cacheKey_key" ON "SearchLocation"("cacheKey");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_locationId_createdAt_idx" ON "ScoreSnapshot"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SearchLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
