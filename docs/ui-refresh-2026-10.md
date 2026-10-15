# UI refresh (PR #9 to #12), October 2026

A page-by-page review of the running app, followed by four pull requests. Every page was checked at desktop (1440 px) and phone (390 px) widths, in light and dark themes, before and after each change.

## Goals

- **Say what the page is about.** Every result page names its address, and the overall score sits next to it.
- **Lead with the answer.** Each card shows its main number first; method notes are folded away.
- **Say each thing once.** Repeated disclaimers, counts and headings were removed.
- **Work on a phone.** No sideways scrolling, nothing that wraps onto four rows, no text smaller than 12 px.
- **Keep it simple.** No new API routes, no new libraries, no data changes. Most changes reuse existing components and styles.

## PR #9: location result, compare and details pages

| Problem                                                                                                              | Change                                                                                                                                                                                                         | Files                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The result page never showed the address; the overall score was as small as a button                                 | A result header with the address as the page title, the save action and the overall score together. The search box moved to a full-width compact row above it                                                  | `LocationHeader.tsx`, `ExploreWorkspace.tsx`                                                                 |
| Category cards re-sorted by weight when the preset changed, so the eye lost its place                                | Cards stay in the fixed order from `categories.ts`, and each gets a thin score bar in its category colour                                                                                                      | `ScoreBreakdown.tsx`                                                                                         |
| The No car / Car owner toggle used 10 px text and sat far from the preset buttons                                    | Same size as the preset picker, placed next to it above the category cards                                                                                                                                     | `MobilityProfile.tsx`, `ScoreBreakdown.tsx`                                                                  |
| Dates showed as 15/10/2026 on one page and 10/15/2026 on another                                                     | One `formatEvidenceDate` helper (Australian day/month order, UTC) used everywhere                                                                                                                              | `utils.ts`, `LocationHeader.tsx`, `CategoryDetails.tsx`, `ComparePanel.tsx`                                  |
| On a phone, the compare table scrolled sideways and hid both scores                                                  | Columns are A, B and Lead (for example "A +6"), so three columns fit 390 px. Full addresses stay in the selectors and in column tooltips                                                                       | `ComparePanel.tsx`                                                                                           |
| The details page had about 11 lines of footnotes, and three indicators repeated the overview                         | Four equal cards (commute, walking, rent, terrain) in a 2×2 grid from `lg` up. Each leads with its answer, keeps data sources visible, and folds method notes into a shared "How this is measured" `<details>` | `LocationDetails.tsx`, `CbdTravelCard.tsx`, `TerrainCard.tsx`, `RentalInsights.tsx`, `MethodNotes.tsx` (new) |
| Transit access, daily convenience and amenity density repeated overview scores or reflected the 20-result search cap | The walking card shows only walk times and car reliance. `buildWalkingIndicators` was split out of `indicators.ts`; the AI analyst still receives all five indicators                                          | `WalkingCard.tsx` (replaces `AdditionalIndicators.tsx`), `indicators.ts`                                     |
| The terrain card had no link from the overview                                                                       | "Explore more" lists commute, walking, rent and terrain                                                                                                                                                        | `ExploreWorkspace.tsx`                                                                                       |
| A missing API key showed its environment variable name to visitors                                                   | Visitors see "Travel times are unavailable right now"; the key name goes to `console.error` on the server                                                                                                      | `services/cbdTravel.ts`                                                                                      |
| A "Planned: ..." list looked unfinished                                                                              | Removed from the page                                                                                                                                                                                          | `indicators.ts`                                                                                              |

## PR #10: home page

| Problem                                                                       | Change                                                                                                                                              | Files         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| A heading, two bullets and three steps came before the search box             | Search first, with one subtitle line                                                                                                                | `Welcome.tsx` |
| The copy said "any Australian address" but commute times only cover Melbourne | The subtitle says "Best for Melbourne. No account needed."                                                                                          | `Welcome.tsx` |
| Only two example suburbs                                                      | Four different kinds of area: South Yarra, Footscray, Box Hill, Brunswick                                                                           | `Welcome.tsx` |
| The right-hand illustration carried no information and filled a phone screen  | A static "Example result" card (overall score, four category bars from the real category labels and colours, three bullet lines), hidden below `lg` | `Welcome.tsx` |
| Signed-in users had to open a collapsed section to reach their places         | Saved and recent locations are shown directly                                                                                                       | `Welcome.tsx` |

## PR #11: category detail page

| Problem                                                                                                         | Change                                                                                                         | Files                                         |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| The count and nearest distance were stated up to three times; the list title repeated the page title            | One "Nearby places" heading with the search scope beside it                                                    | `CategoryDetails.tsx`, `NearbyPlacesList.tsx` |
| Eight category buttons wrapped onto four rows on a phone                                                        | One sideways-scrolling row on phones (the current category scrolls into view); unchanged on desktop            | `CategoryDetails.tsx`                         |
| The sub-page header repeated the save button and a profile tag                                                  | Sub-page headers keep only the back link, title and address. The profile moved next to the category weight     | `LocationHeader.tsx`, `CategoryDetails.tsx`   |
| The category score had no score bar, unlike the overview cards                                                  | Same bar in the category colour                                                                                | `CategoryDetails.tsx`                         |
| Only three places showed before "Show all"                                                                      | Ten places show before "Show all"                                                                              | `NearbyPlacesList.tsx`                        |
| 11 px review text squeezed place names; type and address were only in a hover tooltip, which phones cannot show | Two-line rows: name and distance, then type and reviews in 12 px. The address appears when a place is selected | `NearbyPlacesList.tsx`                        |
| On desktop the map scrolled away while reading a longer list                                                    | The map column is sticky from `lg` up                                                                          | `CategoryDetails.tsx`                         |

`NearbyPlacesList` is only used by the category page, so its unused loading, error and two-column branches were removed at the same time.

## PR #12: login page

| Problem                                                                              | Change                                                                                                                                                          | Files                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signing in always landed on the home page, so "Sign in to save" lost the location    | Sign-in links carry the current page as `/login?next=...`. Email and Google sign-in return there                                                                | `hooks/useLoginHref.ts` (new), `LocationHeader.tsx`, `RentalInsights.tsx`, `RecentSearches.tsx`, `AuthStatus.tsx`, `compare/page.tsx`, `login/page.tsx` |
| A `next` parameter could be abused to send people to another site (an open redirect) | `safeNextPath` only accepts same-site paths: no `https://`, `//host`, backslashes or control characters. Anything else falls back to `/`. Covered by unit tests | `utils.ts`, `utils.test.ts`                                                                                                                             |
| The page did not say which site it was                                               | "Your Renting Helper" above the card, linking home; "Back to search" removed                                                                                    | `login/page.tsx`                                                                                                                                        |
| Fields had only placeholders, which disappear while typing                           | Visible labels; the 8-character password hint only shows when signing up                                                                                        | `login/page.tsx`                                                                                                                                        |
| Google sign-in sat below the email form                                              | Google first, then "or", then email                                                                                                                             | `login/page.tsx`                                                                                                                                        |

The login page reads `next` from the address bar only when the user submits, so it does not need a Suspense boundary around `useSearchParams`. New email sign-ups still go to the verification page rather than `next`.

## How each change was checked

- `npm run format:check`, `npm run lint`, `npx tsc --noEmit` and `npx vitest run` (114 tests after PR #12).
- A production build with `next build`.
- Playwright screenshots at 1440 and 390 px against a local database seeded with two test locations, with a check that no page scrolls sideways. Services without local keys (Google Maps, travel times, terrain) were mocked in the browser.
- For PR #12, a mocked email sign-in from a location page returned to that location, and `?next=//evil.example` landed on `/`.

## Not done yet

- With no Maps key, the map area is a large empty box (only affects local and self-hosted setups).
- On phones, the top navigation wraps onto a second line.
- The compare page could preselect both locations when a user has exactly two saved.
