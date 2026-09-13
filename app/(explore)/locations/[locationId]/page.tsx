import { ExploreWorkspace } from "@/app/components/ExploreWorkspace";
import { LocationLoader } from "@/app/components/LocationLoader";
export default async function LocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  return (
    <LocationLoader locationId={locationId}>
      <ExploreWorkspace />
    </LocationLoader>
  );
}
