import { LocationLoader } from "@/app/components/LocationLoader";
import { LocationDetails } from "@/app/components/LocationDetails";
export default async function DetailsPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  return (
    <LocationLoader locationId={locationId}>
      <LocationDetails />
    </LocationLoader>
  );
}
