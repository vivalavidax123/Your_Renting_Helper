import { redirect } from "next/navigation";

// This page was folded into the single location page; old links land there
// with their scoring choice intact.
export default async function LegacyLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locationId } = await params;
  const { profile, preset } = await searchParams;
  const query = new URLSearchParams();
  if (typeof profile === "string") query.set("profile", profile);
  if (typeof preset === "string") query.set("preset", preset);
  const suffix = query.size > 0 ? "?" + query : "";
  redirect("/locations/" + encodeURIComponent(locationId) + suffix);
}
