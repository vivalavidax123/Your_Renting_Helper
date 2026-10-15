"use client";

import { usePathname, useSearchParams } from "next/navigation";

// Sign-in links carry the current page as ?next= so the login page can bring
// the user back to it. The login page checks the value with safeNextPath.
export function useLoginHref() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  if (pathname === "/") return "/login";

  const current = query ? `${pathname}?${query}` : pathname;
  return `/login?next=${encodeURIComponent(current)}`;
}
