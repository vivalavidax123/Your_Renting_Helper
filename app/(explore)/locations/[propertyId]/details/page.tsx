import { LocationBoundary } from "@/app/components/LocationBoundary";
import { SupportingDetails } from "@/app/components/SupportingDetails";
export default async function DetailsPage({ params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  return <LocationBoundary propertyId={propertyId}><SupportingDetails /></LocationBoundary>;
}
