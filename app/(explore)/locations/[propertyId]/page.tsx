import { Home } from "@/app/components/Home";
import { LocationBoundary } from "@/app/components/LocationBoundary";
export default async function LocationPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  return (
    <LocationBoundary propertyId={propertyId}>
      <Home />
    </LocationBoundary>
  );
}
