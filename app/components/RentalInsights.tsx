"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { isJsonRecord, readApiResult } from "@/app/lib/api";
import type {
  GeocodeLocation,
  RentalEstimate,
  RentalPropertyProfile,
  RentalPropertyType,
  RentalReportSummary,
  RequestState,
} from "@/app/lib/types";
import { formatRadius } from "@/app/lib/utils";

const propertyOptions: Array<{
  value: RentalPropertyType;
  label: string;
}> = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "unit", label: "Unit" },
  { value: "other", label: "Other" },
];

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

function isEstimatePayload(value: Record<string, unknown>) {
  const ownReport = value.ownReport;
  const suggestedProfile = value.suggestedProfile;
  const isProfile = (profile: unknown) =>
    isJsonRecord(profile) &&
    propertyOptions.some((option) => option.value === profile.propertyType) &&
    typeof profile.bedrooms === "number";

  return (
    isRentalEstimate(value.estimate) &&
    (ownReport === null ||
      (isJsonRecord(ownReport) &&
        typeof ownReport.weeklyRent === "number" &&
        propertyOptions.some(
          (option) => option.value === ownReport.propertyType,
        ) &&
        typeof ownReport.bedrooms === "number")) &&
    (suggestedProfile === null || isProfile(suggestedProfile))
  );
}

export function RentalInsights({
  location,
  canContribute,
}: {
  location: GeocodeLocation | null;
  canContribute: boolean;
}) {
  const [state, setState] = useState<RequestState>("idle");
  const [estimate, setEstimate] = useState<RentalEstimate | null>(null);
  const [ownReport, setOwnReport] =
    useState<RentalReportSummary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [weeklyRent, setWeeklyRent] = useState("");
  const [propertyType, setPropertyType] =
    useState<RentalPropertyType>("apartment");
  const [bedrooms, setBedrooms] = useState("1");
  const [submissionState, setSubmissionState] =
    useState<RequestState>("idle");
  const [message, setMessage] = useState("");
  const restoredInitialProfile = useRef(false);

  useEffect(() => {
    if (!location) {
      return;
    }

    const controller = new AbortController();

    async function loadEstimate() {
      setState("loading");

      try {
        const query = new URLSearchParams({
          lat: String(location?.latitude),
          lng: String(location?.longitude),
          propertyType,
          bedrooms,
        });
        const response = await fetch(`/api/rent-estimates?${query}`, {
          signal: controller.signal,
        });
        const data = await readApiResult<{
          estimate: RentalEstimate;
          ownReport: RentalReportSummary | null;
          suggestedProfile: RentalPropertyProfile | null;
        }>(
          response,
          isEstimatePayload,
        );

        if (controller.signal.aborted) return;

        if (!response.ok || !data.ok) {
          setState("error");
          setMessage(data.ok ? "Rental data is unavailable." : data.error);
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
          setMessage("Rental data is unavailable.");
        }
      }
    }

    void loadEstimate();
    return () => controller.abort();
  }, [location, propertyType, bedrooms]);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!location) return;

    setSubmissionState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/rent-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formattedAddress: location.formattedAddress,
          latitude: location.latitude,
          longitude: location.longitude,
          weeklyRent: Number(weeklyRent),
          propertyType,
          bedrooms: Number(bedrooms),
        }),
      });
      const data = await readApiResult<{
        estimate: RentalEstimate;
        ownReport: RentalReportSummary;
        suggestedProfile: null;
      }>(
        response,
        isEstimatePayload,
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
      setWeeklyRent(String(data.ownReport.weeklyRent));
    } catch {
      setSubmissionState("error");
      setMessage("Could not save the report. Try again.");
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Community rent</h2>
      <p className="mt-1 text-xs leading-5 text-ink-muted">
        A median from rents reported by registered users — not scraped listings
        or an official valuation.
      </p>

      {state === "idle" ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-ink-soft">
          Search for a location to see community rental evidence.
        </p>
      ) : null}

      {state === "loading" ? (
        <p className="mt-4 text-sm font-medium text-ink-soft">
          Checking nearby reports…
        </p>
      ) : null}

      {state === "error" ? (
        <p className="mt-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {message}
        </p>
      ) : null}

      {state === "success" && estimate ? (
        <div className="mt-4 rounded-lg border border-line bg-surface-subtle p-4">
          {estimate.medianWeeklyRent === null ? (
            <p className="text-sm leading-6 text-ink-soft">
              No reports within 10 km yet. The first contribution will start
              the local estimate.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-soft">Reported median</span>
                <strong className="text-lg text-ink">
                  ${estimate.medianWeeklyRent.toLocaleString()}/wk
                </strong>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {estimate.reportCount} {estimate.reportCount === 1 ? "report" : "reports"} within {formatRadius(estimate.radiusMeters)}
                {estimate.confidence === "early"
                  ? " · early data, use with caution"
                  : " · smallest radius with at least 3 reports"}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-faint">
                Comparing {bedrooms === "0" ? "studio" : `${bedrooms}-bedroom`} {propertyOptions.find((option) => option.value === propertyType)?.label.toLowerCase()} properties.
              </p>
            </>
          )}
        </div>
      ) : null}

      {location ? (
        <div className="mt-4 border-t border-line pt-4">
          {ownReport ? (
            <p className="mb-3 rounded-lg border border-accent-line bg-accent-soft px-3 py-2.5 text-sm leading-6 text-accent-ink">
              Your report: ${ownReport.weeklyRent.toLocaleString()}/wk ·{" "}
              {ownReport.bedrooms === 0
                ? "studio"
                : `${ownReport.bedrooms}-bedroom`} {propertyOptions
                .find((option) => option.value === ownReport.propertyType)
                ?.label.toLowerCase()}
            </p>
          ) : null}
          {canContribute ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen((open) => !open);
                  setMessage("");
                  setSubmissionState("idle");
                }}
                aria-expanded={isFormOpen}
                className="text-sm font-semibold text-accent hover:text-accent-hover"
              >
                {isFormOpen
                  ? "Close rent form"
                  : ownReport
                    ? "Update your known weekly rent"
                    : "Add a known weekly rent"}
              </button>

              {isFormOpen ? (
                <form onSubmit={submitReport} className="mt-4 space-y-3">
                  <div>
                    <label htmlFor="weekly-rent" className="text-xs font-medium text-ink-soft">
                      Weekly rent (AUD)
                    </label>
                    <input
                      id="weekly-rent"
                      type="number"
                      min="50"
                      max="5000"
                      step="1"
                      required
                      value={weeklyRent}
                      onChange={(event) => setWeeklyRent(event.target.value)}
                      className="mt-1 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="property-type" className="text-xs font-medium text-ink-soft">
                        Property type
                      </label>
                      <select
                        id="property-type"
                        value={propertyType}
                        onChange={(event) =>
                          setPropertyType(event.target.value as RentalPropertyType)
                        }
                        className="mt-1 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                      >
                        {propertyOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="bedrooms" className="text-xs font-medium text-ink-soft">
                        Bedrooms
                      </label>
                      <select
                        id="bedrooms"
                        value={bedrooms}
                        onChange={(event) => setBedrooms(event.target.value)}
                        className="mt-1 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                      >
                        <option value="0">Studio</option>
                        {[1, 2, 3, 4, 5, 6].map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submissionState === "loading"}
                    className="w-full rounded-md bg-action px-3 py-2 text-sm font-semibold text-action-ink hover:bg-action-hover disabled:bg-action-disabled"
                  >
                    {submissionState === "loading" ? "Saving…" : "Submit report"}
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <p className="text-sm leading-6 text-ink-soft">
              <Link href="/login" className="font-semibold text-accent hover:text-accent-hover">
                Sign in
              </Link>{" "}
              to add a rent you know.
            </p>
          )}

          {message && submissionState !== "idle" ? (
            <p
              className={`mt-3 rounded-md px-3 py-2 text-xs leading-5 ${
                submissionState === "success"
                  ? "border border-accent-line bg-accent-soft text-accent-ink"
                  : "border border-danger-line bg-danger-soft text-danger-ink"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
