import { notFound } from "next/navigation";
import { rentScoreCategories } from "@/app/lib/categories";
import { LocationBoundary } from "@/app/components/LocationBoundary";
import { CategoryDetails } from "@/app/components/CategoryDetails";
export default async function CategoryPage({ params }: { params: Promise<{ propertyId: string; categoryId: string }> }) {
  const { propertyId, categoryId } = await params;
  if (!rentScoreCategories.some(category=>category.id===categoryId)) notFound();
  return <LocationBoundary propertyId={propertyId}><CategoryDetails key={categoryId} categoryId={categoryId} /></LocationBoundary>;
}
