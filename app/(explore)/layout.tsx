import { Suspense } from "react";
import { ExploreProvider } from "../components/ExploreProvider";
import { SiteHeader } from "../components/SiteHeader";
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><Suspense fallback={<p className="p-6" role="status">Opening your location workspace…</p>}><ExploreProvider>{children}</ExploreProvider></Suspense></>;
}
