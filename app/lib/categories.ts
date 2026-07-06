export type RentScoreCategory = {
  id: string;
  label: string;
  radiusMeters: number;
  colorClass: string;
  detail: string;
  // Typical Google rating for this kind of place (banks trend ~2-3.5,
  // gyms ~4.5-5). Quality scoring compares against this baseline so a
  // category's review culture does not bias the score.
  typicalRating: number;
  brandTerms: string[];
  placeTypes: string[];
  // Google returns places whose secondary types match the search (e.g.
  // hotels for "gym" because they contain one); reject these primary types.
  excludedPrimaryTypes?: string[];
};

export const defaultSearchRadiusMeters = 3000;

export const rentScoreCategories: RentScoreCategory[] = [
  {
    id: "shopping_centres",
    label: "Shopping Centres",
    radiusMeters: 10000,
    colorClass: "bg-teal-500",
    typicalRating: 4.2,
    detail: "Major shopping centres and retail hubs within a broader area",
    brandTerms: ["Westfield", "Stockland", "DFO", "shopping centre", "shopping mall"],
    placeTypes: ["shopping_mall"],
  },
  {
    id: "groceries",
    label: "Groceries",
    colorClass: "bg-emerald-500",
    typicalRating: 4.2,
    radiusMeters: defaultSearchRadiusMeters,
    detail: "Supermarkets and everyday grocery options nearby",
    brandTerms: ["Woolworths", "Coles", "ALDI", "IGA", "Harris Farm"],
    placeTypes: ["supermarket", "grocery_store"],
  },
  {
    id: "food",
    label: "Food & Cafes",
    radiusMeters: defaultSearchRadiusMeters,
    colorClass: "bg-amber-500",
    typicalRating: 4.3,
    detail: "Cafes, restaurants, and casual food options nearby",
    brandTerms: [
      "McDonald's",
      "KFC",
      "Hungry Jack's",
      "Guzman y Gomez",
      "Starbucks",
      "Gloria Jean's",
    ],
    placeTypes: ["cafe", "restaurant", "bakery", "meal_takeaway"],
  },
  {
    id: "transport",
    label: "Transport",
    radiusMeters: defaultSearchRadiusMeters,
    colorClass: "bg-sky-500",
    typicalRating: 3.8,
    detail:
      "Bus stops within 1 km, or closest bus stops if none are found nearby, plus the nearest metro/train and V/Line stations",
    brandTerms: ["Sydney Trains", "Metro station", "light rail station"],
    placeTypes: ["train_station", "bus_station", "subway_station", "light_rail_station"],
  },
  {
    id: "health",
    label: "Health",
    radiusMeters: defaultSearchRadiusMeters,
    colorClass: "bg-rose-500",
    typicalRating: 4.2,
    detail: "Pharmacies, clinics, and everyday health services nearby",
    brandTerms: [
      "Chemist Warehouse",
      "Priceline Pharmacy",
      "TerryWhite Chemmart",
      "Amcal Pharmacy",
    ],
    placeTypes: ["pharmacy", "doctor", "hospital"],
  },
  {
    id: "fitness",
    label: "Fitness & Recreation",
    radiusMeters: defaultSearchRadiusMeters,
    colorClass: "bg-violet-500",
    // Blended baseline: boutique gyms trend ~4.7 but public pools and
    // recreation centres trend ~4.2-4.4, so the mixed category sits lower.
    typicalRating: 4.5,
    detail:
      "Gyms, pools, and recreation facilities in the surrounding area",
    brandTerms: [
      "Anytime Fitness",
      "Fitness First",
      "Snap Fitness",
      "Plus Fitness",
      "Zip Fitness",
      "YMCA",
      "Aquatic Centre",
      "Recreation Centre",
      "Leisure Centre",
    ],
    placeTypes: [
      "gym",
      "fitness_center",
      "swimming_pool",
      "sports_complex",
      "sports_club",
    ],
    // Spectator venues are not places to exercise; participatory venues
    // (pools, rinks, fields) stay in.
    excludedPrimaryTypes: [
      "hotel",
      "motel",
      "resort_hotel",
      "extended_stay_hotel",
      "inn",
      "bed_and_breakfast",
      "hostel",
      "apartment_building",
      "apartment_complex",
      "association_or_organization",
      "stadium",
      "arena",
      "event_venue",
    ],
  },
  {
    id: "fuel",
    label: "Fuel & Automotive",
    radiusMeters: defaultSearchRadiusMeters,
    colorClass: "bg-orange-500",
    typicalRating: 4.0,
    detail: "Fuel stations and major automotive parts stores nearby",
    brandTerms: ["Ampol", "BP", "Shell", "7-Eleven", "Repco", "Supercheap Auto", "Autobarn", "Burson Auto Parts"],
    placeTypes: ["gas_station"],
  },
  {
    id: "services",
    label: "Services",
    radiusMeters: defaultSearchRadiusMeters,
    colorClass: "bg-indigo-500",
    typicalRating: 3.3,
    detail: "Banks, post offices, and practical services nearby",
    brandTerms: ["Australia Post", "Commonwealth Bank", "ANZ", "NAB", "Westpac"],
    placeTypes: ["post_office", "bank"],
  },
];

export type WeightProfile = "balanced" | "carFree" | "carOwner";

// Category weights depend on lifestyle: a renter without a car has no use
// for fuel stations but depends on transit; a car owner tolerates distance
// and cares about parking-friendly destinations. Each column sums to 100 so
// a weight reads directly as a percentage of the overall score.
export const weightProfiles: Record<WeightProfile, Record<string, number>> = {
  balanced: {
    shopping_centres: 10,
    groceries: 20,
    food: 13,
    transport: 20,
    health: 15,
    fitness: 10,
    fuel: 6,
    services: 6,
  },
  carFree: {
    shopping_centres: 8,
    groceries: 22,
    food: 14,
    transport: 28,
    health: 15,
    fitness: 10,
    fuel: 0,
    services: 3,
  },
  carOwner: {
    shopping_centres: 13,
    groceries: 18,
    food: 12,
    transport: 8,
    health: 15,
    fitness: 10,
    fuel: 14,
    services: 10,
  },
};
