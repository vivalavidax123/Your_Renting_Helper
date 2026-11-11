# UI refresh port (PR #15 to #19), November 2026

A separate design prototype (the `ui-refresh` branch) was built on the 5 August main, 67 commits behind the current one. It assumed a single-page app, so it could not be merged. Its visual design was ported onto the current pages instead, in five pull requests, keeping every newer feature (route-based pages, presets, terrain, commute, rent, AI analyst, the tested sign-in flows).

## What was ported

| PR  | Change                                                                                                                                                                                                   | Main files                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| #15 | Score-band tokens and `scoreBand`; category colour defined once as hex (`categoryColor`) and read by UI and map markers; shared icons; the site logo                                                     | `globals.css`, `utils.ts`, `categories.ts`, `googleMaps.ts`, `icons.tsx`, `icon.svg`                                   |
| #16 | Overall score ring with band word, evidence date and match type; category rows with icon tiles and band-coloured bars; category page ring; one-line header with logo and avatar menu                     | `ScoreRing.tsx`, `LocationHeader.tsx`, `ScoreBreakdown.tsx`, `CategoryDetails.tsx`, `SiteHeader.tsx`, `AuthStatus.tsx` |
| #17 | Walk rings, category toggles and recentre on the map; home pin and enlarged selected marker; richer popups; drawn placeholder without a Maps key; sortable place rows with rating, address and walk time | `LocationMap.tsx`, `googleMaps.ts`, `NearbyPlacesList.tsx`                                                             |
| #18 | Search box icons, clear button, `/` shortcut and combobox semantics; band-coloured saved and recent chips; Copy link with a toast; compare rings and a one-line summary                                  | `SearchForm.tsx`, `RecentSearches.tsx`, `LocationHeader.tsx`, `Toast.tsx`, `ComparePanel.tsx`                          |
| #19 | How it works page; styled not-found and error pages and a root `global-error.tsx`; print styles                                                                                                          | `(explore)/how-it-works/page.tsx`, `(explore)/error.tsx`, `(explore)/not-found.tsx`, `global-error.tsx`                |

This also closes two gaps listed in the October review: the map card is no longer an empty box without a Maps key, and the top navigation no longer wraps onto a second line on phones.

## Decisions

- **Rows keep a fixed order.** The prototype re-sorted category rows by weight when the profile changed. PR #9 had already chosen a fixed order so the eye does not lose its place, and that was kept.
- **Rows link to category pages instead of expanding.** The current app gives each category its own page with the places and map, so an inline expansion would repeat it.
- **No phone tabs.** The prototype's Scores / Places / Map tabs assume everything is on one page; here places and the map already live on each category page.
- **Map toggles are map-only state.** Nothing outside the map reads which categories are hidden, so the state stays in `LocationMap`.
- **Account settings (data export and deletion) were not ported.** They are a feature, not UI, and need to be rebuilt on the current Prisma schema in their own change.

## How each change was checked

`npm run format:check`, `npm run lint`, `npx tsc --noEmit` and `npx vitest run` (128 tests after PR #18), plus CI with a production build on every PR. Each step was checked in the browser against real data at desktop and 375 px widths in light and dark themes. The compare summary needs two saved locations on a signed-in account, so it was covered by a unit test rather than in the browser.
