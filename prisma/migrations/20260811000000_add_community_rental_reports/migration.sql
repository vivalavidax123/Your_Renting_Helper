-- CreateTable
CREATE TABLE "RentalReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "weeklyRent" INTEGER NOT NULL,
    "propertyType" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentalReport_userId_locationKey_key" ON "RentalReport"("userId", "locationKey");

-- CreateIndex
CREATE INDEX "RentalReport_latitude_longitude_idx" ON "RentalReport"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "RentalReport" ADD CONSTRAINT "RentalReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
