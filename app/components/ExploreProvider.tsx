"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { authClient } from "../lib/auth-client";
import type { WeightProfile } from "../lib/categories";
import { useLocationSearch } from "../hooks/useLocationSearch";
import { useSavedSearches } from "../hooks/useSavedSearches";
import { ConversationProvider } from "./ConversationProvider";

type Explore = ReturnType<typeof useLocationSearch> & ReturnType<typeof useSavedSearches> & {
  profile: WeightProfile; changeProfile: (profile: WeightProfile) => void; canSave: boolean; sessionPending: boolean;
};
const Context = createContext<Explore | null>(null);
export function ExploreProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  const [generation, setGeneration] = useState(0);
  if (!isPending && owner !== (session?.user.id ?? null)) {
    if (owner !== undefined) setGeneration(generation + 1);
    setOwner(session?.user.id ?? null);
  }
  return <ExploreSession key={generation} userId={session?.user.id ?? null} sessionPending={isPending}>{children}</ExploreSession>;
}
function ExploreSession({ children, userId, sessionPending }: { children: ReactNode; userId: string | null; sessionPending: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const requestedProfile = params.get("profile");
  const profile: WeightProfile = requestedProfile === "carOwner" ? "carOwner" : "carFree";
  const search = useLocationSearch(profile);
  const saved = useSavedSearches(search.busy ? "loading" : search.placesState, userId);
  const { cancelSearch } = search;
  useEffect(() => () => cancelSearch(), [pathname, cancelSearch]);
  function changeProfile(next: WeightProfile) {
    const query = new URLSearchParams(params); query.set("profile", next);
    window.history.replaceState(null, "", pathname + "?" + query + window.location.hash);
  }
  return <Context.Provider value={{ ...search, ...saved, profile, changeProfile, canSave: !!userId, sessionPending }}>
    <ConversationProvider>
      {requestedProfile && requestedProfile !== "carFree" && requestedProfile !== "carOwner" ?
        <p role="alert" className="p-6">Unknown mobility profile. <button className="underline" onClick={() => changeProfile("carFree")}>Use No car</button></p> : children}
    </ConversationProvider>
  </Context.Provider>;
}
export function useExplore() {
  const context = useContext(Context);
  if (!context) throw new Error("ExploreProvider is required.");
  return context;
}
