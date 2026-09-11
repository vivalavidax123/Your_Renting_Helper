# Website usability and navigation implementation plan

Status: follow-up interface refinements in progress. The original navigation and evidence work is complete; the shared-header, account-control, and profile-placement adjustments below are being delivered in separate verified chunks.
Reviewed: 11 September 2026. Basis: supplied screenshot, current repository source, installed Next.js 16.2.6 routing documentation, and local mocked-network browser checks at desktop, mobile, approximate 200% zoom, light/dark theme, and reduced-motion settings.

## 1. Outcome and scope

Make the first visit self-explanatory, keep the main location view compact, make scores open their supporting evidence, and preserve chat when changing mobility profile or navigating to details.

Recommended first-release decisions:

- Put the product name at the top left in shared navigation.
- Replace the title area inside the main card with a short usage guide.
- Show a purposeful welcome state before search, with example-search buttons and an illustrative preview. Do not automatically fetch a real location.
- Keep search, score summary, map, and a compact AI question entry on the overview. Move long lists, supporting evidence, and comparison to dedicated routes.
- Render the page structure immediately; reveal the core score result together. Let the map and optional evidence finish independently in reserved space.
- Keep one visible conversation per location across mobility profiles; label answers with the profile used.
- Preserve conversations during in-app navigation using shared client state. Reload and cross-device persistence are outside this release.
- Keep search and single-location analysis available without sign-in. Keep saving and saved-location comparison account-based.
- Reuse existing scoring, category definitions, amenity groups, authentication, and database snapshots. No schema migration or new state-management dependency is planned.

Success criteria:

1. At 1366 × 768 and normal text size, a fresh visitor sees the brand, instructions, search, and example actions without scrolling.
2. On a 390-pixel-wide phone and at 200% zoom, controls remain readable and accessible with natural scrolling and no page-wide horizontal overflow.
3. A visitor can search, understand the score, open a category, and return without repeating the search.
4. All eight category scores are discoverable; their detail pages agree with the overview for the same data and profile.
5. Switching No car / Car owner preserves messages and draft text; the next question uses the newly selected profile.
6. Overview → category → overview and overview → comparison → overview preserve relevant application state during client navigation.
7. A slow or failed optional service never prevents use of successful core results.
8. Comparison numbers and AI context use the same selected profile, and access checks match the saved-location product behaviour.

## 2. Baseline findings that guided the implementation

| Feedback | Evidence | Implication |
| --- | --- | --- |
| Title occupies useful card space | `app/page.tsx` places the h1 and overall score inside the large left card; theme/auth sit separately above | Extract a shared header and use the card opening for guidance |
| First visit feels empty | All result components are mounted before search and each displays its own unavailable message | Introduce one welcome state rather than many repeated empty cards |
| Content appears at different times | `useLocationSearch` geocodes before fetching amenities; CBD and rent fetch independently after location changes; map loads its browser library separately | This is a request dependency issue as well as a presentation issue; rendering performance remains unmeasured |
| Chat disappears on profile change | `LocationAnalyst` key includes both property ID and profile; messages live in component state | Changing the key recreates the component and discards its state |
| Comparison chat has the same risk | `ComparisonAnalyst` key includes A, B, and profile | Apply the conversation-state rule to both analysts |
| Category scores cannot navigate | `ScoreBreakdown` renders each score as an article | Turn cards into real links with visible interaction cues |
| Homepage is long | Amenity list, rent, commute, comparison, indicators, and chat share the homepage | Separate overview from detailed evidence |
| New routes could lose state | Search currently belongs to `Home`; chat belongs to individual panels | Move state that must survive navigation above those pages |
| Comparison can disagree with profile | `/api/compare` reads stored snapshot scores without a profile; comparison AI recomputes from groups with a profile | Rescore comparison from raw groups for the selected profile |
| Comparison access is inconsistent | Comparison chat checks session and ownership; comparison GET currently does neither | Apply the same saved-location access checks to GET |
| Freshness copy is stale | Score tooltip says 24 hours; store TTL is seven days | Use the actual fetched-at time and correct cache wording |

The current chat API receives only the current question and profile. Keeping previous messages visible does not give the model conversational memory. This distinction must remain explicit in both implementation and UI wording.

## 3. Proposed screens and interactions

### Welcome screen

Shared top bar: product name linked to `/`, Search, Compare, theme control, sign-in/account control. Keep account space stable while its session check completes. Do not briefly present signed-out actions as confirmed while authentication is pending.

Main card copy:

> Find out how convenient a rental location is.
>
> 1. Search an address or suburb.
> 2. Choose No car or Car owner, then open a score to see nearby places.
> 3. Ask a question, or sign in to save two locations and compare them.

Place the search field immediately below this copy. Add “No account needed to search.” Example buttons can use public suburb names such as South Yarra VIC and Footscray VIC. A button submits that explicit query through the same search flow as typed input; it does not fabricate scores or insert private history. Implement query submission as an explicit argument so selecting an example does not depend on an asynchronous input-state update.

The right side shows a lightweight schematic illustration with “Your location and nearby places will appear here.” It must look illustrative, with no invented real scores, business names, or provider-map screenshot. The live map mounts after a search result is ready. A real default map could be added later if user testing shows it helps, but it adds loading and API use before the user has chosen a location.

Hide empty score, chat, rent, commute, comparison-selector, and indicator panels. Keep Compare discoverable in navigation, where its dedicated page explains prerequisites.

For signed-in visitors with no active search, show a compact recent-search row and a “Show all recent searches” disclosure if needed. Do not automatically open the most recent address. Avoid allowing eight history chips to dominate the first screen.

### Location overview

After search, the welcome copy contracts to “Choose a profile. Open a category for details. Ask a question about the result.” Keep a How to use disclosure available.

Recommended order:

1. Search field and compact recent searches.
2. Matched address, overall score, mobility profile, and Save action.
3. Eight clickable category cards, sorted using existing weights.
4. Compact Ask about this location entry, with two suggested questions initially visible.
5. Map alongside the summary on desktop; below the summary on mobile.
6. Small links to commute, community rent, and other indicators on the evidence page.

Each category card shows label, score /100, nearby count, closest distance, and a visible “View details” cue. Include keyboard focus, hover styling, and an accessible link name such as “Groceries, 84 out of 100, view details.” Fuel remains clickable despite its zero weight; mark it “Not included in overall score” without making it look disabled.

The score represents everyday convenience, not a complete judgment of rental quality. Use a short explanation near the score. Show the matched location clearly, especially for suburb-level searches.

Move the current long Nearby amenities list, full comparison panel, full rent form, and additional indicators off the overview. Do not force all post-search content into a fixed screen height. Once a conversation grows, use its existing bounded transcript area and allow normal page scrolling where needed.

### Category page

Route: `/locations/[propertyId]/categories/[categoryId]?profile=carFree`.

Show an explicit Back to overview link, address, category navigation, selected mobility profile, category score and weight, existing deterministic explanation, retrieval radius, fetched-at date, and relevant amenity list beside a map filtered to this category. Use the category IDs from `rentScoreCategories`, not a second hard-coded list.

Reuse amenity-row content and map-selection behaviour. A row selects and opens its marker. On mobile, retain a return-to-row action when selection scrolls to the map. Preserve transport-specific fields and the existing rule that Transitland IDs are not Google Place IDs.

Explain direct distances accurately; do not rename them walking routes or travel times. For transport, preserve its special retrieval rules rather than claiming every result comes from a single uniform radius. For no matches, show “No matching places found in this search,” not a claim that none exist locally.

Invalid category or missing location gets a useful not-found page. A location with no usable snapshot gets “Search this location again” if its stored address is available. Provider/database errors get an error state, not a false not-found state.

### Supporting evidence page

Route: `/locations/[propertyId]/details?profile=carFree`.

Reuse `CbdTravelCard`, `RentalInsights`, and `AdditionalIndicators`. Provide anchors for `#commute`, `#rent`, and `#indicators` so overview links open the intended section. Keep the current Melbourne CBD scope explicit; changing destination cities is a separate feature.

Preserve rental property type/bedroom controls, contribution sign-in rules, uncertainty labels, and location-scoped form state. Do not present planned datasets as available. Load commute and rent only when this page is opened; changing rental filters may reload rent without reloading scores or commute.

### Comparison page

Route: `/compare?a=[id]&b=[id]&profile=carFree`; `/compare` also works before selection.

Keep the feature visible to guests, with an explanatory signed-out state and sign-in action. Signed-in users with zero saved locations see “Search and save two locations to compare”; with one, show that location and a search action for the second. Scoreless favourites remain visible with a re-search action rather than disappearing without explanation.

With two eligible locations, show full addresses, one shared profile control, overall and category scores, fetched-at dates for both sides, and comparison chat. Distinguish ties from differences. On mobile allow horizontal scrolling inside a labelled comparison-table region rather than clipping columns or overflowing the entire page.

Links from comparison rows can open each side's category evidence. Preserve the selected pair in the URL and shared state. Returning from evidence must retain selections and chat.

## 4. Routes, data ownership, and state

Recommended route structure uses a `(explore)` route group. Parentheses organise files without changing public URLs:

| File | Responsibility |
| --- | --- |
| `app/(explore)/layout.tsx` | Shared header and a small client provider that survives navigation |
| `app/(explore)/page.tsx` | Welcome screen and active overview; replaces root page implementation |
| `app/(explore)/locations/[propertyId]/page.tsx` | Direct-link location overview |
| `app/(explore)/locations/[propertyId]/categories/[categoryId]/page.tsx` | Category evidence |
| `app/(explore)/locations/[propertyId]/details/page.tsx` | Commute, rent, indicators |
| `app/(explore)/compare/page.tsx` | Saved-location comparison |

Use ordinary Next.js links and supported route loading/error/not-found files. Await route `params` and server `searchParams` according to installed documentation. Keep the root layout, theme bootstrap, and authentication routes intact. Do not introduce parallel or intercepted routes for this straightforward page navigation.

The small shared provider owns the active search result, mobility profile, and in-memory conversations. Existing hooks and types remain authoritative. Do not add Redux or a general-purpose caching framework.

For successful persisted searches, navigate to `/locations/[propertyId]?profile=...`. During navigation, reuse the result just fetched rather than issuing another paid search. If persistence fails and `/api/places` returns a null property ID, retain the usable overview at `/`; explain why persistent detail links and AI are unavailable and offer retry. Never create a fake route ID.

Direct links and reloads load stored location metadata and its latest snapshot through a focused read-only GET `/api/locations/[propertyId]`. Reuse/extend the existing store lookup to return `GeocodeLocation`, groups, fetched-at time, and profile-derived scores. This endpoint returns shared location evidence only, never user history, saved relationships, or chat. Validate profile and path input at this API boundary.

Use one snapshot read for each result response, then derive every score from its groups. Existing in-memory results are reused while navigating, keeping overview and category evidence consistent. A new direct load may see a newer snapshot; show its timestamp. Expired snapshots are labelled as saved evidence with an explicit search-again action. Reading a detail URL must not silently trigger a paid provider refresh.

The URL carries location, category, comparison pair, and profile, making refresh and Back/Forward deterministic. It does not carry messages, complete place groups, or personal drafts. URL profile takes precedence when entering a route; all controls update that same selection. Invalid profile values produce a clear validation response, and a missing profile defaults to No car.

Chat maps use location ID for single-location conversations and ordered A/B IDs for comparison conversations. Keep user and assistant text, draft, request status, and profile-at-submission metadata. Scope this state to the current account or anonymous visit; clear it on confirmed sign-out/account change. Initial session resolution must not accidentally erase anonymous work.

Version one preserves state across client navigation, not browser refresh, closing the tab, or another device. This is an explicit boundary, not durable saved chat. If reload persistence is later requested, add a separate bounded browser-storage or database design rather than silently changing privacy expectations now.

## 5. Chat correctness and streaming behaviour

First remove profile from component identity, then lift state so page navigation cannot discard it. Merely changing the key fixes profile switching but is insufficient for the new multi-page flow.

Rules:

- A profile switch immediately updates deterministic scores. It does not clear the transcript or draft and does not automatically call AI.
- Every submitted turn captures the current profile. Its answer is labelled “Answered using No car” or “Answered using Car owner.” Old answers remain historical, not rewritten as current advice.
- If profile changes while an answer streams, let that request finish under its captured profile. A later question uses the new profile. Prevent a second simultaneous send for that conversation.
- Store a stable message/turn identifier and update that message during streaming. Do not assume the final array item is always the intended assistant reply after navigation or other state changes.
- On route departure or location/pair change, abort the active stream, preserve completed text, and mark incomplete text as interrupted. Reset request status so returning does not leave Send disabled. A late chunk cannot update another conversation.
- Add an explicit Clear conversation action; this removes messages and draft for that conversation only and aborts its active stream.
- Preserve both single-location and comparison conversations using the same ownership rules; extract only the actually shared message type if useful, not a new chatbot framework.

Retain the existing single-question backend contract for this release. Wording should explain that answers use the current location data and submitted question. True follow-up reasoning over past messages is a separate enhancement requiring bounded history, server validation, profile context, and token-budget tests. Do not claim “the AI remembers” merely because the transcript persists.

## 6. Loading and request flow

Do not wait for every provider and every map tile before showing useful results. Show one stable page structure and coordinate only the core result.

1. Initial visit renders the welcome screen without amenities, CBD, rent, map-library, or AI requests. Session/history requests are separate account work.
2. Search immediately changes its state to “Finding location…” with a reserved result skeleton. Skeleton means a placeholder matching the final layout's size.
3. Successful geocoding starts amenities retrieval and changes status to “Finding nearby places and calculating scores…”. Do not invent percentage progress.
4. Commit address, overall score, category scores, groups, and property ID as one coherent result. Do not pair location A's scores with location B's map or title.
5. Mount the map for the committed result. Its container is already sized; show a local loading message until ready. A map failure leaves scores, links, and chat usable.
6. Supporting services begin on the evidence page and resolve independently within stable cards. A rent failure does not erase commute or scores.

Keep the existing AbortController/request-ID protection and extend it across any new route loader. Preserve the last successful result during a replacement search with a clear loading overlay and temporarily disabled dependent actions; on failure, identify that the previous result is still shown. Never silently leave old results looking like the failed query's answer.

`LocationMap` currently constructs a new map when location or place-group references change. Delivering committed groups together avoids its initial empty-group/result-group reconstruction. Preserve stable group references on profile changes. Any further map lifecycle optimisation should follow a measured reproduction; do not broadly rewrite the map during the layout change.

Measure warm-cache search, cold search, and map readiness separately in a production build. Use network throttling and selectively blocked requests to distinguish provider latency from browser rendering. Route `loading.tsx` covers route loading; existing client fetches still need explicit loading state. Neither is a substitute for the other.

## 7. Implementation checkpoints

### Checkpoint 0 — Baseline and design boundaries

- Reproduce signed-out idle, signed-in idle, search loading, results, profile switch, chat streaming, and comparison.
- Record screenshots at desktop/mobile sizes and timings for cached/uncached searches.
- Run baseline lint, type checking, tests, and production build; record failures before editing.
- Confirm existing tests and current implementation rather than relying on documented test counts.
- Draw the welcome and overview layout using the screen definitions above; verify text fits at target sizes.

Exit: current behaviour is reproducible, baseline failures are understood, and initial screen content is fixed.

### Checkpoint 1 — Profile/chat regression fix

- Update `app/page.tsx`, `LocationAnalyst.tsx`, and comparison analyst state/keys.
- Preserve messages/drafts across profile switches and capture profile per turn.
- Correct in-flight state handling and add regression coverage for switching during streaming.

Exit: changing profile cannot erase either chat or apply a reply to the wrong context.

### Checkpoint 2 — Navigation and data foundation

- Move the explore page into the route group and add the persistent provider/header.
- Lift active result and conversation state; adapt `useLocationSearch` without duplicating search logic.
- Add stored-location read route and narrow store support, preserving null-persistence behaviour.
- Add URL/profile handling, direct overview routes, error/not-found/loading states, and Back/Forward restoration.

Exit: overview → temporary detail page → overview preserves result and chat; opening a location URL in a fresh tab can reconstruct its evidence.

### Checkpoint 3 — Welcome and compact overview

- Add the guide, example query actions, preview illustration, and authenticated recent-search disclosure.
- Show welcome and result states intentionally; remove redundant empty panels.
- Move overall score beside address/profile; add a clear Save action and compact chat composer.
- Add result-sized placeholders and atomic core-result display.

Exit: first visit fits the target desktop viewport; mobile and zoom remain accessible; examples perform real searches only after activation.

### Checkpoint 4 — Category and supporting evidence pages

- Convert category articles to links; reuse existing category definitions and `CategoryScore.explanation`.
- Adapt `NearbyPlacesList` to render the selected group and reuse map/list selection.
- Add evidence page, anchors, and navigation links; move existing supporting components there.
- Carry fetched-at through the search hook and read route; correct obsolete 24-hour wording.

Exit: every category opens matching evidence; no-match/invalid/missing-data cases are clear; rent/commute are fetched only where needed.

### Checkpoint 5 — Comparison page and consistency

- Move `ComparePanel` to the dedicated page and make selections/profile URL-driven.
- Make GET `/api/compare` require a session and verify both IDs are saved by the current user, reusing the chat route's established checks.
- Accept and validate profile; calculate both sides from stored raw groups through the existing scoring function.
- Ensure profile changes reload/recalculate both displayed sides without clearing chat. Block AI submission until the table represents that profile.
- Add guest, zero/one saved location, scoreless favourite, invalid pair, and unavailable snapshot states.

Exit: table and AI agree under both profiles; direct requests cannot bypass saved-location access rules.

### Checkpoint 6 — Full flow verification and documentation

- Run automated checks and browser acceptance scenarios below.
- Review light/dark themes, keyboard navigation, reduced motion, text zoom, mobile layout, long addresses, and long chat answers.
- Confirm no paid fetches start just because category links are prefetched or the welcome screen opens.
- Update `dev_notes.md` to describe actual routes, chat lifetime, loading, and comparison behaviour; update README for user-facing workflow changes.
- After each requested push, apply the repository's full post-push documentation reconciliation rule.

Exit: all success criteria pass or any genuine environment blocker is explicitly recorded with the unverified scenarios.

## 8. Verification matrix

| Scenario | Expected result |
| --- | --- |
| Fresh signed-out visit | Clear instructions/examples; no repeated search-required boxes or provider-backed result calls |
| Signed-in visit with history | Compact personal recent list; no automatic location opening |
| Example query | Correct suburb submitted once through normal search flow |
| Rapid searches A then B | No late A response replaces B or mixes their evidence |
| Search fails after an existing result | Previous address remains explicitly labelled; error names the failed search |
| Amenities succeed, map fails | Scores/category links remain usable; map reports its own failure |
| Slow rent or commute | Core overview unaffected; independent evidence-card loading/errors |
| Profile switch | Scores recalculate, groups remain unchanged, map does not reset solely for profile |
| Profile switch during AI stream | Existing answer retains its submitted profile; next request uses new profile |
| Category navigation and Back | Address/profile/result/chat remain available without another paid search |
| Direct category URL and reload | Stored data loads; no dependency on previously mounted homepage |
| Missing snapshot or unknown category | Recovery/not-found UI instead of crash or fabricated values |
| Same location, different profiles | Both sets of historical chat messages remain distinguishable |
| Different location/pair | Transcript isolated; switching back restores its completed transcript |
| Account changes | Prior account's in-memory conversations and saved selections cleared |
| Comparison GET with no session | 401 |
| Comparison GET with unsaved IDs | 403 |
| Comparison profile change | Both columns and subsequent AI context use the selected profile |
| Zero/one/scoreless favourites | Next action explained; no unexplained disabled selectors |
| Category keyboard activation | Enter follows a real link; focus and return navigation remain usable |
| Phone/200% zoom | Readable controls, natural scrolling, no clipped critical content |

Add focused route tests for the new location GET and comparison authentication/profile behaviour. Add browser regression coverage for chat lifetime and cross-page navigation: these bugs involve component mounting and cannot be proved by scoring unit tests alone. The project currently has Vitest but no browser end-to-end suite; a local-only Playwright installation and narrow mocked-network checks cover these stateful flows. New test files, fixtures, configuration, and test dependencies are not committed, following the owner’s instruction. Keep provider calls mocked in repeatable tests, then perform a separate real-provider smoke check when credentials are available. Do not add a broad testing framework beyond this need.

Completion checks:

```text
npm run lint            # Passed
npx tsc --noEmit        # Passed
npm test                # 90 local tests across 17 files passed
npm run build           # Passed, including all new routes
node <local check>.cjs  # Focused mocked-network browser checks passed
```

The two added route-test files, browser scripts, Playwright package changes, and the analyst expectation correction remain local-only by owner request. The committed suite remains 82 tests across 15 files and retains the documented analyst expectation mismatch.

## 9. Deferred work and tradeoffs

- Durable chat history, model conversation memory, and cross-device syncing are separate features.
- Guest comparison is deferred because current saved-location comparison is account-based.
- A real auto-loaded demonstration map/result is deferred; examples remain explicit user actions.
- A universal no-scroll page would harm phone/zoom accessibility; the target is a focused first desktop screen.
- Scoring formula changes, new datasets, arbitrary commute destinations, and unrelated account/operational fixes are outside scope.
- Moving content onto pages adds a click, but makes the overview easier to understand. Clear links, persistent context, and reliable Back navigation are necessary to make that tradeoff worthwhile.
- Full simultaneous reveal would make every successful feature wait for the slowest service. Coordinated core results plus stable independent panels is the recommended compromise.

Recommended implementation order: fix chat/profile loss, establish persistent navigation/data ownership, simplify welcome/overview, add evidence pages, move and correct comparison, then verify the complete flow. Each checkpoint should leave a working application.

## 10. Follow-up interface refinements

1. Make the shared logo clear the active result and search field before returning to the welcome page; remove the duplicate Search navigation link. **Implemented.**
2. Remove the duplicate comparison link from the overview and place Sign out inside an email-triggered account disclosure.
3. Keep the location profile selector on the overview, show read-only profile context on evidence pages, and retain the comparison page's required shared profile selector.

Each item is verified and pushed separately. Local browser scripts and test dependencies remain uncommitted.
