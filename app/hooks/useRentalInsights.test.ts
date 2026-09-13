import { describe, expect, it } from "vitest";
import type { GeocodeLocation } from "@/app/lib/types";
import {
  buildRentalEstimateUrl,
  buildRentalReportBody,
  isRentalEstimatePayload,
} from "./useRentalInsights";

const location: GeocodeLocation = {
  query: "Richmond",
  formattedAddress: "Richmond VIC 3121, Australia",
  placeId: "place-1",
  latitude: -37.8183,
  longitude: 144.9984,
  locationType: "APPROXIMATE",
  types: ["locality"],
};

describe("useRentalInsights request boundaries", () => {
  it("builds the estimate URL from the selected rental profile", () => {
    expect(
      buildRentalEstimateUrl({
        location,
        propertyType: "apartment",
        bedrooms: "2",
      }),
    ).toBe(
      "/api/rent-estimates?lat=-37.8183&lng=144.9984&propertyType=apartment&bedrooms=2",
    );
  });

  it("converts form values into the report API body", () => {
    expect(
      buildRentalReportBody({
        location,
        weeklyRent: "575",
        propertyType: "townhouse",
        bedrooms: "3",
      }),
    ).toEqual({
      formattedAddress: "Richmond VIC 3121, Australia",
      latitude: -37.8183,
      longitude: 144.9984,
      weeklyRent: 575,
      propertyType: "townhouse",
      bedrooms: 3,
    });
  });

  it("accepts the complete estimate response and rejects malformed data", () => {
    expect(
      isRentalEstimatePayload({
        estimate: {
          medianWeeklyRent: 575,
          reportCount: 4,
          radiusMeters: 2000,
          confidence: "community",
        },
        ownReport: {
          weeklyRent: 575,
          propertyType: "townhouse",
          bedrooms: 3,
        },
        suggestedProfile: null,
      }),
    ).toBe(true);
    expect(
      isRentalEstimatePayload({
        estimate: null,
        ownReport: null,
        suggestedProfile: null,
      }),
    ).toBe(false);
  });
});
