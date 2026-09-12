"use client";

import type { WeightProfile } from "@/app/lib/categories";
import type { RequestState } from "@/app/lib/types";
import { AnalystChat } from "./AnalystChat";

const suggestedQuestions = [
  "Why did this location get this score?",
  "What would day-to-day life be like here?",
] as const;

export function LocationAnalyst({
  locationId,
  profile,
  placesState,
  signedIn,
  sessionPending,
}: {
  locationId: string | null;
  profile: WeightProfile;
  placesState: RequestState;
  signedIn: boolean;
  sessionPending: boolean;
}) {
  const available =
    !sessionPending &&
    signedIn &&
    placesState === "success" &&
    locationId !== null;
  const unavailableMessage = sessionPending
    ? "Checking sign-in status..."
    : !signedIn
      ? "Sign in to ask about this location."
      : placesState === "success" && locationId === null
        ? "This result could not be saved, so grounded analysis is unavailable. Search again to retry."
        : "Search for a location before asking the analyst.";

  return (
    <AnalystChat
      conversationKey={"location:" + locationId}
      endpoint={"/api/locations/" + locationId + "/chat"}
      profile={profile}
      available={available}
      title="Ask about this location"
      inputId="location-analyst-question"
      placeholder="Ask about daily life, or include your commute and priorities..."
      unavailablePlaceholder={unavailableMessage}
      pendingLabel="Analysing this location..."
      suggestions={suggestedQuestions}
      formMarginClassName="mt-4"
    />
  );
}
