import { prisma } from "@/app/lib/db";
import { getDistanceMeters } from "@/app/lib/scoring";
import type {
  RentalEstimate,
  RentalPropertyProfile,
  RentalPropertyType,
  RentalReportSummary,
} from "@/app/lib/types";

const estimateRadiiMeters = [1000, 3000, 5000, 10000] as const;
const minimumCommunityReports = 3;
const maximumEstimateRadiusMeters = 10000;

export const rentalPropertyTypes: RentalPropertyType[] = [
  "apartment",
  "house",
  "townhouse",
  "unit",
  "other",
];

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function getBoundingBox(latitude: number, longitude: number) {
  const latitudeDelta = maximumEstimateRadiusMeters / 111_320;
  const longitudeScale = Math.max(
    Math.cos((latitude * Math.PI) / 180),
    0.01,
  );
  const longitudeDelta =
    maximumEstimateRadiusMeters / (111_320 * longitudeScale);

  return {
    latitude: { gte: latitude - latitudeDelta, lte: latitude + latitudeDelta },
    longitude: {
      gte: longitude - longitudeDelta,
      lte: longitude + longitudeDelta,
    },
  };
}

export async function getRentalEstimate(
  latitude: number,
  longitude: number,
  propertyType: RentalPropertyType,
  bedrooms: number,
): Promise<RentalEstimate> {
  const maximumRadius =
    estimateRadiiMeters.at(-1) ?? maximumEstimateRadiusMeters;
  const boundingBox = getBoundingBox(latitude, longitude);

  // The bounding box keeps the database query cheap. Haversine distance then
  // removes the box corners and gives the real circular search radius.
  const nearby = await prisma.rentalReport.findMany({
    where: {
      propertyType,
      bedrooms,
      ...boundingBox,
    },
    select: { latitude: true, longitude: true, weeklyRent: true },
  });
  const withDistance = nearby
    .map((report) => ({
      ...report,
      distanceMeters: getDistanceMeters(
        { latitude, longitude },
        { latitude: report.latitude, longitude: report.longitude },
      ),
    }))
    .filter((report) => report.distanceMeters <= maximumRadius);

  const selectedRadius =
    estimateRadiiMeters.find(
      (radius) =>
        withDistance.filter((report) => report.distanceMeters <= radius)
          .length >= minimumCommunityReports,
    ) ?? maximumRadius;
  const selected = withDistance.filter(
    (report) => report.distanceMeters <= selectedRadius,
  );

  return {
    medianWeeklyRent:
      selected.length > 0
        ? median(selected.map((report) => report.weeklyRent))
        : null,
    reportCount: selected.length,
    radiusMeters: selectedRadius,
    confidence:
      selected.length >= minimumCommunityReports
        ? "community"
        : selected.length > 0
          ? "early"
          : "none",
  };
}

export async function getSuggestedRentalProfile(
  latitude: number,
  longitude: number,
): Promise<RentalPropertyProfile | null> {
  const nearby = await prisma.rentalReport.findMany({
    where: getBoundingBox(latitude, longitude),
    select: {
      latitude: true,
      longitude: true,
      propertyType: true,
      bedrooms: true,
    },
  });
  const groups = new Map<
    string,
    RentalPropertyProfile & { count: number; nearestDistanceMeters: number }
  >();

  for (const report of nearby) {
    if (
      !rentalPropertyTypes.includes(report.propertyType as RentalPropertyType) ||
      !Number.isInteger(report.bedrooms) ||
      report.bedrooms < 0 ||
      report.bedrooms > 10
    ) {
      continue;
    }

    const distanceMeters = getDistanceMeters(
      { latitude, longitude },
      { latitude: report.latitude, longitude: report.longitude },
    );

    if (distanceMeters > maximumEstimateRadiusMeters) {
      continue;
    }

    const key = `${report.propertyType}:${report.bedrooms}`;
    const existing = groups.get(key);
    groups.set(key, {
      propertyType: report.propertyType as RentalPropertyType,
      bedrooms: report.bedrooms,
      count: (existing?.count ?? 0) + 1,
      nearestDistanceMeters: Math.min(
        existing?.nearestDistanceMeters ?? Number.POSITIVE_INFINITY,
        distanceMeters,
      ),
    });
  }

  const best = [...groups.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.nearestDistanceMeters - b.nearestDistanceMeters ||
      a.propertyType.localeCompare(b.propertyType) ||
      a.bedrooms - b.bedrooms,
  )[0];

  return best
    ? { propertyType: best.propertyType, bedrooms: best.bedrooms }
    : null;
}

export async function saveRentalReport({
  userId,
  formattedAddress,
  latitude,
  longitude,
  weeklyRent,
  propertyType,
  bedrooms,
}: {
  userId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  weeklyRent: number;
  propertyType: RentalPropertyType;
  bedrooms: number;
}) {
  const locationKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}:${propertyType}:${bedrooms}`;

  return prisma.rentalReport.upsert({
    where: { userId_locationKey: { userId, locationKey } },
    update: { formattedAddress, latitude, longitude, weeklyRent },
    create: {
      userId,
      locationKey,
      formattedAddress,
      latitude,
      longitude,
      weeklyRent,
      propertyType,
      bedrooms,
    },
    select: { weeklyRent: true, propertyType: true, bedrooms: true },
  });
}

export async function getLatestRentalReport(
  userId: string,
  latitude: number,
  longitude: number,
): Promise<RentalReportSummary | null> {
  const locationKeyPrefix = `${latitude.toFixed(4)},${longitude.toFixed(4)}:`;
  const report = await prisma.rentalReport.findFirst({
    where: { userId, locationKey: { startsWith: locationKeyPrefix } },
    orderBy: { updatedAt: "desc" },
    select: { weeklyRent: true, propertyType: true, bedrooms: true },
  });

  if (!report || !rentalPropertyTypes.includes(report.propertyType as RentalPropertyType)) {
    return null;
  }

  return {
    weeklyRent: report.weeklyRent,
    propertyType: report.propertyType as RentalPropertyType,
    bedrooms: report.bedrooms,
  };
}
