"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import {
  rentalPropertyOptions as propertyOptions,
  useRentalInsights,
} from "@/app/hooks/useRentalInsights";
import type { GeocodeLocation, RentalPropertyType } from "@/app/lib/types";
import { formatRadius } from "@/app/lib/utils";

export function RentalInsights({
  location,
  canContribute,
}: {
  location: GeocodeLocation | null;
  canContribute: boolean;
}) {
  const {
    state,
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
  } = useRentalInsights(location);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitReport();
  }

  return (
    <div className="h-full rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Community rent</h2>
      <p className="mt-1 text-xs leading-5 text-ink-muted">
        Rents reported by users, not an official valuation.
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
              No reports within 10 km yet. The first contribution will start the
              local estimate.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-soft">Reported median</span>
                <strong className="text-2xl font-semibold text-ink">
                  ${estimate.medianWeeklyRent.toLocaleString()}/wk
                </strong>
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {estimate.reportCount}{" "}
                {estimate.reportCount === 1 ? "report" : "reports"} within{" "}
                {formatRadius(estimate.radiusMeters)}
                {estimate.confidence === "early"
                  ? " · early data, use with caution"
                  : " · smallest radius with at least 3 reports"}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-faint">
                Comparing {bedrooms === "0" ? "studio" : `${bedrooms}-bedroom`}{" "}
                {propertyOptions
                  .find((option) => option.value === propertyType)
                  ?.label.toLowerCase()}{" "}
                properties.
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
                : `${ownReport.bedrooms}-bedroom`}{" "}
              {propertyOptions
                .find((option) => option.value === ownReport.propertyType)
                ?.label.toLowerCase()}
            </p>
          ) : null}
          {canContribute ? (
            <>
              <button
                type="button"
                onClick={toggleForm}
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
                <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="weekly-rent"
                      className="text-xs font-medium text-ink-soft"
                    >
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
                      <label
                        htmlFor="property-type"
                        className="text-xs font-medium text-ink-soft"
                      >
                        Property type
                      </label>
                      <select
                        id="property-type"
                        value={propertyType}
                        onChange={(event) =>
                          setPropertyType(
                            event.target.value as RentalPropertyType,
                          )
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
                      <label
                        htmlFor="bedrooms"
                        className="text-xs font-medium text-ink-soft"
                      >
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
                    {submissionState === "loading"
                      ? "Saving…"
                      : "Submit report"}
                  </button>
                </form>
              ) : null}
            </>
          ) : (
            <p className="text-sm leading-6 text-ink-soft">
              <Link
                href="/login"
                className="font-semibold text-accent hover:text-accent-hover"
              >
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
