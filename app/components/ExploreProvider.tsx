"use client";
import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { authClient } from "@/app/lib/authClient";
import {
  isWeightPreset,
  scoringQuery,
  type WeightPreset,
  type WeightProfile,
} from "@/app/lib/categories";
import { useLocationSearch } from "@/app/hooks/useLocationSearch";
import { useSavedSearches } from "@/app/hooks/useSavedSearches";
import { ConversationProvider } from "./ConversationProvider";

type Explore = ReturnType<typeof useLocationSearch> &
  ReturnType<typeof useSavedSearches> & {
    profile: WeightProfile;
    changeProfile: (profile: WeightProfile) => void;
    preset: WeightPreset;
    changePreset: (preset: WeightPreset) => void;
    // "profile=…&preset=…" for links that must keep the scoring choice.
    scoringParams: string;
    canSave: boolean;
    sessionPending: boolean;
  };
const Context = createContext<Explore | null>(null);
export function ExploreProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  return (
    <ExploreSession
      key={session?.user.id ?? "anonymous"}
      userId={session?.user.id ?? null}
      sessionPending={isPending}
    >
      {children}
    </ExploreSession>
  );
}
function ExploreSession({
  children,
  userId,
  sessionPending,
}: {
  children: ReactNode;
  userId: string | null;
  sessionPending: boolean;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const requestedProfile = params.get("profile");
  const profile: WeightProfile =
    requestedProfile === "carOwner" ? "carOwner" : "carFree";
  // Unknown presets fall back to the default rather than blocking the page:
  // a preset only reweights the overall score, so the fallback is harmless.
  const requestedPreset = params.get("preset");
  const preset: WeightPreset = isWeightPreset(requestedPreset)
    ? requestedPreset
    : "balanced";
  const search = useLocationSearch(profile, preset);
  const saved = useSavedSearches(search.placesState, userId);
  const { cancelSearch, finishWelcomeNavigation } = search;
  useEffect(() => {
    if (pathname === "/") {
      finishWelcomeNavigation();
    }

    return cancelSearch;
  }, [pathname, cancelSearch, finishWelcomeNavigation]);
  function replaceQuery(query: URLSearchParams) {
    window.history.replaceState(
      null,
      "",
      pathname + "?" + query + window.location.hash,
    );
  }
  function changeProfile(next: WeightProfile) {
    const query = new URLSearchParams(params);
    query.set("profile", next);
    replaceQuery(query);
  }
  function changePreset(next: WeightPreset) {
    const query = new URLSearchParams(params);
    if (next === "balanced") query.delete("preset");
    else query.set("preset", next);
    replaceQuery(query);
  }
  return (
    <Context.Provider
      value={{
        ...search,
        ...saved,
        profile,
        changeProfile,
        preset,
        changePreset,
        scoringParams: scoringQuery(profile, preset),
        canSave: !!userId,
        sessionPending,
      }}
    >
      <ConversationProvider>
        {requestedProfile &&
        requestedProfile !== "carFree" &&
        requestedProfile !== "carOwner" ? (
          <p role="alert" className="p-6">
            Unknown mobility profile.{" "}
            <button
              className="underline"
              onClick={() => changeProfile("carFree")}
            >
              Use No car
            </button>
          </p>
        ) : (
          children
        )}
      </ConversationProvider>
    </Context.Provider>
  );
}
export function useExplore() {
  const context = useContext(Context);
  if (!context) throw new Error("ExploreProvider is required.");
  return context;
}
