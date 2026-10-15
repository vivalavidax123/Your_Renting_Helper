"use client";

import { useEffect, useRef, useState } from "react";
import { isJsonRecord, readApiResult } from "@/app/lib/api";
import type {
  GeocodeLocation,
  RentalEstimate,
  RentalPropertyProfile,
  RentalPropertyType,
  RentalReportSummary,
  RequestState,
} from "@/app/lib/types";

export const rentalPropertyOptions: Array<{
  value: RentalPropertyType;
  label: string;
}> = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "unit", label: "Unit" },
  { value: "other", label: "Other" },
];

type RentalEstimatePayload = {
  estimate: RentalEstimate;
  ownReport: RentalReportSummary | null;
  suggestedProfile: RentalPropertyProfile | null;
};

function isRentalEstimate(value: unknown): value is RentalEstimate {
  return (
    isJsonRecord(value) &&
    (typeof value.medianWeeklyRent === "number" ||
      value.medianWeeklyRent === null) &&
    typeof value.reportCount === "number" &&
    typeof value.radiusMeters === "number" &&
    (value.confidence === "none" ||
      value.confidence === "early" ||
      value.confidence === "community")
  );
}

export function isRentalEstimatePayload(
  value: Record<string, unknown>,
): value is RentalEstimatePayload {
  const ownReport = value.ownReport;
  const suggestedProfile = value.suggestedProfile;
  const isProfile = (profile: unknown) =>
    isJsonRecord(profile) &&
    rentalPropertyOptions.some(
      (option) => option.value === profile.propertyType,
    ) &&
    typeof profile.bedrooms === "number";

  return (
    isRentalEstimate(value.estimate) &&
    (ownReport === null ||
      (isJsonRecord(ownReport) &&
        typeof ownReport.weeklyRent === "number" &&
        rentalPropertyOptions.some(
          (option) => option.value === ownReport.propertyType,
        ) &&
        typeof ownReport.bedrooms === "number")) &&
    (suggestedProfile === null || isProfile(suggestedProfile))
  );
}

export function buildRentalEstimateUrl({
  location,
  propertyType,
  bedrooms,
}: {
  location: GeocodeLocation;
  propertyType: RentalPropertyType;
  bedrooms: string;
}) {
  const query = new URLSearchParams({
    lat: String(location.latitude),
    lng: String(location.longitude),
    propertyType,
    bedrooms,
  });

  return `/api/rent-estimates?${query}`;
}

export function buildRentalReportBody({
  location,
  weeklyRent,
  propertyType,
  bedrooms,
}: {
  location: GeocodeLocation;
  weeklyRent: string;
  propertyType: RentalPropertyType;
  bedrooms: string;
}) {
  return {
    formattedAddress: location.formattedAddress,
    latitude: location.latitude,
    longitude: location.longitude,
    weeklyRent: Number(weeklyRent),
    propertyType,
    bedrooms: Number(bedrooms),
  };
}

export function useRentalInsights(location: GeocodeLocation | null) {
  const [state, setState] = useState<RequestState>("idle");
  const [estimate, setEstimate] = useState<RentalEstimate | null>(null);
  const [ownReport, setOwnReport] = useState<RentalReportSummary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [weeklyRent, setWeeklyRent] = useState("");
  const [propertyType, setPropertyType] =
    useState<RentalPropertyType>("apartment");
  const [bedrooms, setBedrooms] = useState("1");
  const [submissionState, setSubmissionState] = useState<RequestState>("idle");
  // The load error and the form's submit feedback are separate so that
  // opening or closing the form never blanks the estimate's error box.
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const restoredInitialProfile = useRef(false);

  useEffect(() => {
    if (!location) return;

    const activeLocation = location;
    const controller = new AbortController();

    async function loadEstimate() {
      setState("loading");

      try {
        const response = await fetch(
          buildRentalEstimateUrl({
            location: activeLocation,
            propertyType,
            bedrooms,
          }),
          { signal: controller.signal },
        );
        const data = await readApiResult<RentalEstimatePayload>(
          response,
          isRentalEstimatePayload,
        );

        if (controller.signal.aborted) return;

        if (!response.ok || !data.ok) {
          setState("error");
          setLoadError(data.ok ? "Rental data is unavailable." : data.error);
          return;
        }

        setOwnReport(data.ownReport);

        if (!restoredInitialProfile.current) {
          restoredInitialProfile.current = true;
          const initialProfile = data.ownReport ?? data.suggestedProfile;

          if (data.ownReport) {
            setWeeklyRent(String(data.ownReport.weeklyRent));
          }

          if (
            initialProfile &&
            (initialProfile.propertyType !== propertyType ||
              String(initialProfile.bedrooms) !== bedrooms)
          ) {
            setPropertyType(initialProfile.propertyType);
            setBedrooms(String(initialProfile.bedrooms));
            return;
          }
        }

        setEstimate(data.estimate);
        setState("success");
      } catch {
        if (!controller.signal.aborted) {
          setState("error");
          setLoadError("Rental data is unavailable.");
        }
      }
    }

    void loadEstimate();
    return () => controller.abort();
  }, [location, propertyType, bedrooms]);

  function toggleForm() {
    setIsFormOpen((open) => !open);
    setMessage("");
    setSubmissionState("idle");
  }

  async function submitReport() {
    if (!location) return;

    setSubmissionState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/rent-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildRentalReportBody({
            location,
            weeklyRent,
            propertyType,
            bedrooms,
          }),
        ),
      });
      const data = await readApiResult<RentalEstimatePayload>(
        response,
        isRentalEstimatePayload,
      );

      if (!response.ok || !data.ok) {
        setSubmissionState("error");
        setMessage(data.ok ? "Could not save the report." : data.error);
        return;
      }

      setEstimate(data.estimate);
      setOwnReport(data.ownReport);
      setState("success");
      setSubmissionState("success");
      setMessage("Thanks — your report is now included in this area estimate.");
      if (data.ownReport) {
        setWeeklyRent(String(data.ownReport.weeklyRent));
      }
    } catch {
      setSubmissionState("error");
      setMessage("Could not save the report. Try again.");
    }
  }

  return {
    state,
    loadError,
    estimate,
    ownReport,
    isFormOpen,
    weeklyRent,
    setWeeklyRent,
    propertyType,
    setPropertyType,
    bedrooms,
    setBedrooms,
    submissionState,
    message,
    toggleForm,
    submitReport,
  };
}
