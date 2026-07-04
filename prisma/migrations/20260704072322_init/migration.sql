-- CreateTable
CREATE TABLE "SearchLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "overallScore" REAL NOT NULL,
    "scoresJson" TEXT NOT NULL,
    "groupsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreSnapshot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SearchLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchLocation_cacheKey_key" ON "SearchLocation"("cacheKey");

-- CreateIndex
CREATE INDEX "ScoreSnapshot_locationId_createdAt_idx" ON "ScoreSnapshot"("locationId", "createdAt");
