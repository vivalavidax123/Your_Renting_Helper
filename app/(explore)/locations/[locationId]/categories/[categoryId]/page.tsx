import { notFound } from "next/navigation";
import { rentScoreCategories } from "@/app/lib/categories";
import { LocationLoader } from "@/app/components/LocationLoader";
import { CategoryDetails } from "@/app/components/CategoryDetails";
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locationId: string; categoryId: string }>;
}) {
  const { locationId, categoryId } = await params;
  if (!rentScoreCategories.some((category) => category.id === categoryId))
    notFound();
  return (
    <LocationLoader locationId={locationId}>
      <CategoryDetails key={categoryId} categoryId={categoryId} />
    </LocationLoader>
  );
}
