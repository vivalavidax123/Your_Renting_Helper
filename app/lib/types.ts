export type GeocodeLocation = {
  query: string;
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  locationType: string;
  types: string[];
};

type ApiFailure = {
  ok: false;
  error: string;
  status?: string;
};

export type ApiResult<T extends object> = ({ ok: true } & T) | ApiFailure;

export type RequestState = "idle" | "loading" | "success" | "error";

export type CbdTravel = {
  distanceMeters: number;
  driveMinutes: number | null;
  transitMinutes: number | null;
  warning: string | null;
};

export type RentalEstimate = {
  medianWeeklyRent: number | null;
  reportCount: number;
  radiusMeters: number;
  confidence: "none" | "early" | "community";
};

export type RentalReportSummary = {
  weeklyRent: number;
  propertyType: RentalPropertyType;
  bedrooms: number;
};

export type RentalPropertyProfile = Pick<
  RentalReportSummary,
  "propertyType" | "bedrooms"
>;

export type RentalPropertyType =
  | "apartment"
  | "house"
  | "townhouse"
  | "unit"
  | "other";

export type AddressSuggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

export type PlaceSource = "brand" | "generic";

export type TransportService = {
  routeNumber: string;
  destination: string;
  departureTime: string | null;
};

export type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  primaryType: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating: number | null;
  userRatingCount: number;
  source: PlaceSource;
  transportServices?: TransportService[];
};

export type PlaceGroup = {
  id: string;
  label: string;
  radiusMeters: number;
  places: NearbyPlace[];
};

export type CategoryScore = {
  id: string;
  label: string;
  score: number;
  weight: number;
  colorClass: string;
  detail: string;
  count: number;
  closestDistanceMeters: number | null;
  radiusMeters: number;
  explanation: string;
};

export type RecentSearch = {
  id: string;
  query: string;
  formattedAddress: string;
  placeId: string;
  locationType: string;
  latitude: number;
  longitude: number;
  lastSearchedAt: string;
  savedAt: string | null;
  // Null when the location has no score snapshot (e.g. snapshots were
  // cleared after a scoring change); the location itself still exists.
  overallScore: number | null;
};

export type ComparisonSide = {
  id: string;
  query: string;
  formattedAddress: string;
  overallScore: number;
  scores: CategoryScore[];
  fetchedAt: string;
};

// One committed location result, reused by overview and evidence routes.
export type LocationResult = {
  location: GeocodeLocation;
  groups: PlaceGroup[];
  locationId: string | null;
  fetchedAt: string;
  cached: boolean;
};

export type TerrainLevel = "flat" | "gentle" | "hilly" | "steep";

export type TerrainSummary = {
  level: TerrainLevel;
  radiusMeters: number;
  elevationRangeMeters: number;
  averageGradePercent: number;
  steepestGradePercent: number;
  // Share of sampled stretches at or above the steep-grade threshold, 0-1.
  steepShare: number;
};
