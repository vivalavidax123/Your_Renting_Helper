import { Suspense } from "react";
import { ExploreProvider } from "@/app/components/ExploreProvider";
import { SiteHeader } from "@/app/components/SiteHeader";
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
