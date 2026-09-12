import { Suspense } from "react";
import { ExploreProvider } from "../components/ExploreProvider";
import { SiteHeader } from "../components/SiteHeader";
export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <p className="p-6" role="status">
          Opening your location workspace…
        </p>
      }
    >
      <ExploreProvider>
        <SiteHeader />
        {children}
      </ExploreProvider>
    </Suspense>
  );
}
