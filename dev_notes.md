# Development Notes

## Purpose of This File

This is the technical source of truth for the repository. It records the current architecture, implementation status, scoring model, operational setup, known gaps, and roadmap.

The README is intentionally general. Historical debugging stories, superseded designs, temporary calibration output, and completed migration diaries do not belong in either document unless they still affect current operation.

## Current Repository Status

Status reviewed against committed `HEAD` on 2026-10-15.

| Area                 | Current state                                              |
| -------------------- | ---------------------------------------------------------- |
| Product              | Deployed functional prototype                              |
| Public application   | https://rent-score-prototype.vercel.app/                   |
| Primary branch       | `main`; Vercel auto-deploys changes pushed to it           |
| Application shape    | Full-stack Next.js application in one repository           |
| Persistence          | PostgreSQL through Prisma                                  |
| Authentication       | Email/password and Google OAuth through Better Auth        |
| Quality gates        | Prettier, ESLint, TypeScript, Vitest, and production build |
| Automated tests      | 111 tests across 21 test files                             |
| Production readiness | Not production-ready; hardening gaps are listed below      |

The core renter workflow is implemented:

1. Search an Australian address or suburb.
2. Geocode the query and retrieve nearby places.
3. Calculate category and overall scores for a no-car or car-owner profile and a score-priority preset.
4. Review amenities, derived indicators, CBD travel, community rent evidence, and the interactive map.
5. Sign in to keep history, save locations, submit known weekly rents, and use the AI analyst.
6. Ask what one location's evidence means for day-to-day renting or compare two saved results with scores and AI analysis.

The product direction remains amenities-first. Scores are compact summaries; nearby places, map context, and practical indicators carry most of the decision detail.

## Feature Status

### Implemented

- Guided welcome screen with example-suburb searches and an illustrative map preview; result panels stay hidden until a successful search.
- Shared-header logo returns to a clean welcome state without starting a provider request; comparison has one entry point in the header.
- Successful searches and direct location opens replace the search query with the matched formatted address; the result view has a full-width compact search row, then a result header that shows the matched address, the save action, and the overall score together.
- Signed-in users open the account email menu to access Sign out; Escape and outside clicks close the menu.
- Australian address autocomplete and geocoding.
- Eight amenity categories with category-level filtering and deduplication.
- Clickable category score cards in fixed category order, each with a score bar in its category colour, plus dedicated evidence routes, category navigation, nearby-place lists, and focused maps. Category and supporting-evidence pages show the address under their title.
- No-car and car-owner scoring profiles.
- Score-priority presets (Balanced, Student, Family, Commuter) that reweight the overall score without changing category scores. The mobility and preset selectors sit together above the overview's category cards and on the comparison page.
- Location overviews own the interactive profile selector; category and supporting-evidence pages show the active profile as read-only context. Comparison retains one shared selector because both locations must use the same profile.
- Seven-day shared result cache.
- Interactive Google map with searched-location and amenity markers.
- Fullscreen map control.
- List-to-map selection, automatic map scrolling, and a return-to-row button.
- Theme-aware map, markers, and custom popup styling.
- Google Maps links in non-transport amenity popups.
- Optional Transitland bus-stop, route, destination, and departure enrichment.
- Derived walkability, transit, density, convenience, and car-reliance indicators.
- Direct distance, rounded Geoapify driving time, and usual weekday 8am public-transport time to Melbourne CBD.
- Terrain card measuring how hilly the land within 1.5 km is, from Google Elevation samples. It is shown as separate evidence and does not change any score.
- Radius-based community median rent estimates for matching property type and bedroom count.
- Authenticated rent reporting with one updatable report per user/location/property combination.
- The latest rent report for a signed-in user and searched location is returned so the form can restore it. `RentalInsights` is keyed by location place ID, while `useRentalInsights` owns its request and form state.
- When a new location's default profile is empty, the strongest nearby property/bedroom group within 10 km is selected automatically.
- Persistent light and dark themes across the main and login views.
- Reduced-motion preferences shorten interface transitions and loading animations.
- Better Auth email/password accounts and Google OAuth.
- Per-user recent searches and saved locations.
- Dedicated two-location comparison page with URL-backed selections, profile-consistent scores, and guidance before enough saved locations are available. The table uses A, B and Lead columns (for example "A +6") so it fits phone width; full addresses stay in the selectors and column tooltips.
- A compact location overview; longer amenity, commute, rent, indicator, and comparison content lives on dedicated routes.
- Evidence dates use Australian day/month format on every page. The rental-quality and distance disclaimers appear once, on the overview.
- Multi-point guidance, evidence notes, data assumptions, and comparison-selection explanations use semantic bullet lists for easier scanning; redundant analyst and comparison-header descriptions are omitted.
- Authenticated, moderation-screened, rental-scoped AI analysis for a searched location and comparison of two saved locations.
- PostgreSQL persistence on Neon for hosted environments.
- Vercel deployment and analytics.
- Docker Compose deployment with local PostgreSQL and automatic migration application.
- GitHub Actions quality checks.

### Partial or Deferred

- Population, school, childcare, safety, and development data are not implemented. Rent data is community-reported rather than an official market dataset.
- Walkability uses straight-line estimates, not route-aware walking times.
- Account email verification is implemented and manually verified end to end with the Resend domain `auth.viva.monster`. Password reset is implemented with its manual inbox/password check pending. Account settings and account deletion are not implemented.
- Application-level rate limiting, structured logging, monitoring, and error tracking are not implemented.
- Automated coverage does not yet include full authentication, database-cache integration, broad place/transport provider-failure paths, or browser end-to-end flows.

## Full-Stack Status

The repository is a full-stack prototype because it contains:

- a React interface and client-side interaction hooks;
- Next.js route handlers under app/api;
- server-side provider orchestration and scoring;
- authentication and session handling;
- PostgreSQL persistence and migrations;
- deployment, Docker, test, and CI configuration.

It is not a production platform. The application still relies on synchronous request/response provider calls and lacks several operational and account-management safeguards. "Prototype" should remain part of public descriptions until the hardening roadmap is addressed.

## Technology Stack

Versions are taken from the current package manifest and deployment files.

| Layer                | Current implementation                                          |
| -------------------- | --------------------------------------------------------------- |
| Framework            | Next.js 16.3.5 App Router                                       |
| UI                   | React 19.2.4                                                    |
| Language             | TypeScript 5                                                    |
| Styling              | Tailwind CSS 4 plus semantic tokens in app/globals.css          |
| Fonts                | Geist and Geist Mono through next/font                          |
| Database             | PostgreSQL                                                      |
| ORM                  | Prisma 6.19.3                                                   |
| Authentication       | Better Auth 1.6.23 with Prisma adapter                          |
| Maps and places      | Google Maps JavaScript API, Places API (New), and Geocoding API |
| Transport enrichment | Transitland v2 REST API, optional                               |
| Analytics            | Vercel Analytics                                                |
| Tests                | Vitest 4.1.11                                                   |
| Static checks        | ESLint 9 and TypeScript                                         |
| Hosted deployment    | Vercel with Neon PostgreSQL                                     |
| Container deployment | Node 22 slim application image and PostgreSQL 17                |
| CI runtime           | GitHub Actions with Node 22                                     |

Prisma 6 is intentional. There is no current need to add the Prisma 7 driver-adapter work to this personal project.

## Repository Structure

```text
app/
  api/
    auth/[...all]/       Better Auth handler
    autocomplete/        Google address suggestions
    cbd-travel/           Distance and indicative travel to Melbourne CBD
    compare/             Stored score comparison
    favourites/          Per-user saved locations
    geocode/             Address to coordinates
    history/             Per-user recent searches
    locations/           Stored-location evidence and grounded chat
    places/              Cache, providers, scoring, and persistence coordinator
    rent-estimates/       Community rent estimates and contributions
    terrain/              Hilliness summary from Google Elevation samples
  components/            Dashboard, map, auth, theme, scores, and result views
  hooks/                 Autocomplete, search, saved-search, and rental controllers
  lib/
    maps/                 Browser-only Google Maps integration
    services/             Google, Transitland, and persistence services
    api.ts                Runtime API-envelope validation
    auth.ts               Better Auth server configuration
    categories.ts         Category metadata, preset weights and profile factors
    indicators.ts         Pure derived-indicator calculations
    scoring.ts            Pure scoring and distance calculations
    terrain.ts            Pure terrain sample points and hilliness summary
    types.ts              Shared domain and API types
  login/                  Sign-in and sign-up page
  layout.tsx              Metadata, fonts, analytics, and theme bootstrap
  (explore)/              Shared search workspace and direct location routes
    compare/              Dedicated saved-location comparison page
    locations/[locationId]/categories/[categoryId]/  Category evidence
    locations/[locationId]/details/  Commute, rent, and derived indicators
  components/ExploreProvider.tsx  Search/session state retained across workspace pages
  components/ConversationProvider.tsx  In-memory location/pair transcripts
  components/AnalystChat.tsx  Shared single-location and comparison chat interface
prisma/
  migrations/             Committed PostgreSQL migrations
  schema.prisma           Application and Better Auth models
.github/workflows/ci.yml  Quality-gate workflow
Dockerfile                Multi-stage production image
docker-compose.yml        App, migration, and PostgreSQL services
```

## Architecture and Code Boundaries

The project deliberately uses a small number of direct boundaries:

- **Route handlers** validate HTTP input, resolve sessions when needed, coordinate services, and translate failures into response codes.
- **Service modules** own Google, Transitland, and Prisma operations.
- **Pure modules** own scoring, indicators, formatting, and shared calculations.
- **Hooks** own browser request state, cancellation, and interaction workflows.
- **Components** focus on rendering and user intent.
- **app/lib/types.ts** owns shared domain contracts. Provider wire types stay beside their Google or Transitland adapter; local component or hook state types remain local when no other module needs them.
- **app/lib/api.ts** validates the common success/error envelope before API data enters UI state.
- **app/lib/maps/googleMaps.ts** is marked client-only and owns SDK loading, marker construction, popup HTML escaping, and map-specific types.

This structure is sufficient for the current project. Do not add repositories, dependency-injection layers, duplicate DTOs, generic state frameworks, or other abstractions without a concrete current need.

## Search and Data Flow

### Browser flow

1. The initial welcome screen makes no amenities, CBD, rent, map-library, or AI requests. Example buttons explicitly submit their suburb through the normal search flow.
2. useAutocomplete waits 250 ms after input, requests /api/autocomplete, and supports keyboard selection.
3. Submitting the form requests /api/geocode.
4. useLocationSearch requests /api/places with coordinates and location metadata.
5. The matched address and amenity groups are committed together, and the formatted address replaces the submitted query in the search field. Persisted results navigate to /locations/[locationId]?profile=... (plus &preset=... when a non-default preset is active); direct visits read stored evidence through GET /api/locations/[locationId] without a provider refresh.
6. The overview renders the address, overall and category scores, compact analyst, and map. Category links reuse the active groups and scoring profile without another provider or database request.
7. CbdTravelCard, TerrainCard, and RentalInsights request /api/cbd-travel, /api/terrain, and /api/rent-estimates only after the supporting-evidence page opens.
8. The client validates each API envelope before updating result state.
9. Older autocomplete, geocode, places, CBD-travel, and rent-estimate requests are aborted so stale responses cannot overwrite newer actions.

The shared-header logo cancels active search work, clears the active result and search field, and returns to `/`. Cached location evidence and in-memory conversations remain available for later navigation within the same session.

### Places route flow

1. Coordinates are rounded to four decimal places to form a shared cache key.
2. /api/places checks for the newest snapshot younger than seven days.
3. A cache hit returns stored place groups and recalculates the requested profile score without calling Google.
4. A cache miss retrieves all categories, filters and deduplicates places, calculates the requested score, and stores a canonical no-car snapshot.
5. If the visitor is signed in, the location is upserted into that user's recent-search history.
6. Cache or persistence failures are logged and do not block a live provider result.

Profile and preset changes recalculate scores in the browser from the existing place groups. They do not call /api/places again or recreate the map.

## API Routes

| Route                                 | Access                                       | Responsibility                                                                                    |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET /api/autocomplete                 | Public                                       | Australian Google Places suggestions                                                              |
| GET /api/geocode                      | Public                                       | Address geocoding and provider error mapping                                                      |
| GET /api/places                       | Public, session-aware                        | Cache lookup, provider retrieval, scoring, snapshot save, optional history write                  |
| GET /api/history                      | Public, session-aware                        | Current user's recent searches; signed-out users receive an empty list                            |
| GET /api/favourites                   | Signed in                                    | Current user's saved locations                                                                    |
| POST /api/favourites                  | Signed in                                    | Save a known location                                                                             |
| DELETE /api/favourites                | Signed in                                    | Remove a saved location                                                                           |
| GET /api/compare                      | Signed in, saved-location ownership required | Recalculate two saved locations from stored evidence for one selected mobility profile and preset |
| GET /api/locations/[locationId]       | Public                                       | Read stored location metadata, raw groups and timestamp without user history or paid refresh      |
| POST /api/locations/[locationId]/chat | Signed in                                    | Answer one grounded question about a stored location and selected mobility profile and preset     |
| POST /api/locations/compare/chat      | Signed in, saved-location ownership required | Answer one grounded comparison question about two saved locations                                 |
| GET /api/cbd-travel                   | Public                                       | Direct distance, Geoapify driving, and Google public-transport estimates to Melbourne CBD         |
| GET /api/rent-estimates               | Public                                       | Like-for-like community median rent within an adaptive 1–10 km radius                             |
| GET /api/terrain                      | Public                                       | Hilliness summary from one Google Elevation request                                               |
| POST /api/rent-estimates              | Signed in                                    | Create or update the caller's rent report for a location/property combination                     |
| /api/auth/[...all]                    | Better Auth                                  | Sign-up, sign-in, sign-out, sessions, and OAuth callbacks                                         |

CBD driving calls use the server-only `GEOAPIFY_API_KEY`, request free-flow
traffic, and round the result to the nearest five minutes. Public transport
temporarily uses the server-only `GOOGLE_MAPS_API_KEY` and a representative
weekday at 8:00 am in `Australia/Melbourne`. The browser map key is never used
for these web-service requests. Route durations are fetched per search and are
not stored in the database. When a key is missing, the server log names it and
visitors see only a plain "unavailable" message.

Terrain samples 81 points: the address plus every 150 m along eight compass
lines out to 1.5 km. All points go to the Google Elevation API in one request
using the server-only `GOOGLE_MAPS_API_KEY`, which must have the Elevation API
enabled. Each 150 m stretch gets an absolute grade, so climbs and descents both
count. The card reports average grade, steepest stretch, the share of
stretches at 5% or more, and the height range. The average grade sets the
label: under 1.5% flat, under 3% gently undulating, under 5% hilly, otherwise
steep. The lines are straight rather than road-following, so the result
describes the surrounding land, not a specific road. Terrain is fetched per
visit, not stored, and does not change category or overall scores.
The design rationale is in
[docs/terrain-design-zh.md](./docs/terrain-design-zh.md).

Community rent estimates use reports with the same property type and bedroom
count. The service selects the smallest 1, 3, 5, or 10 km radius containing at
least three reports; when fewer exist within 10 km, it currently returns an
early-data median. A signed-in contribution is upserted by user, rounded
location, property type, and bedroom count so resubmitting that combination
updates the existing row.

## Place Retrieval and Categories

Category configuration lives in app/lib/categories.ts and is the single source of truth for labels, search radii, colour classes, rating baselines, brand terms, included place types, excluded primary types, score-priority preset weights, and mobility-profile proximity factors.

Current category order also defines cross-category deduplication priority:

1. Shopping Centres
2. Groceries
3. Food & Cafes
4. Transport
5. Health
6. Fitness & Recreation
7. Fuel & Automotive
8. Services

### General retrieval rules

- Shopping Centres use a 10 km radius; standard categories use 3 km.
- Each non-transport category makes one Google Nearby Search with a maximum of 20 results.
- Non-transport places with fewer than 30 Google reviews are excluded.
- Brand matches are tagged by local name matching instead of a paid text request per brand.
- Results display by review count, then rating, then distance.
- Each Google place ID is assigned to only one category.
- Category-specific excluded primary types prevent secondary-type mismatches such as hotels appearing as fitness venues.

A fresh uncached search currently makes ten Google Nearby Search calls and one V/Line Text Search. Transitland calls are additional when its key is configured. Keep the provider fan-out visible when adding categories or fields.

### Transport retrieval

Transport is intentionally specialised:

- Up to four nearest bus stops are selected within 1 km.
- If no bus stop is found within 1 km, a wider 5 km fallback is used.
- The nearest metro/train station and nearest recognised V/Line station are included.
- A local V/Line station-name list avoids relying on inconsistent provider classification.
- Transitland is preferred for bus stops and upcoming services when configured.
- Google Places remains the bus-stop fallback, so the transport category still works without Transitland.
- Review thresholds and review-count display do not apply to transport.

## Scoring Model

The current algorithm is Scoring V3. Each category is rounded to an integer out of 100 after three continuous pillars:

### Proximity: 50 points

- Full points when the closest match is within 400 m.
- Beyond 400 m, points decay exponentially.
- The half-life is category radius multiplied by the active profile factor.
- No-car factor: 0.25.
- Car-owner factor: 0.7.
- No match: zero proximity points.

### Variety: 30 points

The formula is 30 x (1 - exp(-count / k)).

- k = 6 for Food & Cafes and Fitness & Recreation.
- k = 3 for other categories.
- No results: zero variety points.

### Quality: 20 points

- Average the three highest available ratings.
- Compare that average with the category's typical-rating baseline.
- Formula: 10 + 12.5 x (average rating - typical rating), clamped to 0-20.
- A populated category with no rating data receives the neutral midpoint of 10.
- A category with no places receives zero.

### Category weights and mobility guarantee

Category priorities come from the active score-priority preset (`weightPresets` in app/lib/categories.ts). Every preset sums to 100 and keeps fuel at 0. Both mobility profiles use the same preset weights; car ownership changes only the proximity decay described above.

| Category             | Balanced | Student | Family | Commuter |
| -------------------- | -------: | ------: | -----: | -------: |
| Shopping Centres     |        8 |       6 |     12 |        5 |
| Groceries            |       22 |      18 |     28 |       20 |
| Food & Cafes         |       14 |      22 |      8 |       12 |
| Transport            |       28 |      32 |     18 |       45 |
| Health               |       15 |       6 |     24 |        8 |
| Fitness & Recreation |       10 |      14 |      6 |        7 |
| Fuel & Automotive    |        0 |       0 |      0 |        0 |
| Services             |        3 |       2 |      4 |        3 |

Balanced is the original weighting and the default. A preset changes only how much each category counts towards the overall score, never a category's own score. The preset travels in the URL as `preset=` next to `profile=`; Balanced is omitted from links. An unknown preset falls back to Balanced in the browser, while the compare and chat APIs reject it with 400.

Using identical weights across profiles keeps them directly comparable. The car-owner half-life is more distance-tolerant, so switching from no-car to car-owner can keep or improve every category score and cannot lower the overall score. Places within the 400 m walkable ring score equally for both profiles; farther amenities can score better for a car owner. Fuel remains visible context but does not affect either overall score.

The overall score is the weighted average of the active category scores. No-car with Balanced weights is the default and canonical stored score. Raw place groups are retained in the snapshot, so another profile or preset can be recalculated without new provider calls.

Any scoring or retrieval change that would make stored place groups or scores misleading requires deliberate ScoreSnapshot invalidation in each intended environment.

## Derived Indicators

app/lib/indicators.ts derives five indicators from the current place groups and category scores:

- **Walkability:** estimated minutes at 80 metres per minute for key destinations.
- **Transit access:** transport score label, closest distance, and available departure count.
- **Amenity density:** total place count across current groups.
- **Daily convenience:** average of groceries, food, health, services, and shopping scores.
- **Car reliance:** estimate based on core categories beyond 1.2 km, with a small fuel-score offset.

## AI Location Analyst

The result page includes a lightweight signed-in single-location chat panel, and the saved-location comparison includes a second panel for comparing two locations. Both reuse `AnalystChat` and `useConversation`, and explain deterministic application data rather than replacing the scoring system.

### Single-location request flow

1. `/api/places` returns the persisted `SearchLocation` id with the score result.
2. The signed-in client sends that id, the current mobility profile and preset, and one question to `POST /api/locations/[locationId]/chat`.
3. The route verifies the Better Auth session and returns 401 without calling the analyst when no session exists.
4. The server loads the latest stored place groups and recomputes scores and indicators for the selected profile and preset.
5. The question passes OpenAI moderation before answer generation; flagged input receives a fixed refusal without reaching another model call.
6. A structured scope classifier allows rental-location questions and returns a fixed refusal for unrelated requests without calling the analyst model.
7. The context builder keeps the score breakdown and up to five nearest amenities per category.
8. The analyst requests a streamed OpenAI response, extracts `response.output_text.delta` events on the server, and forwards only the answer text as it arrives.

### Saved-location comparison request flow

1. The comparison panel sends its URL-backed location IDs, mobility profile, and preset to `GET /api/compare`; the route verifies the session and saved-location ownership before recalculating both score columns from stored place groups.
2. The client sends both location IDs, the current profile and preset, and one question to `POST /api/locations/compare/chat`.
3. The route requires a session and verifies that both locations are saved by that user.
4. The server builds the same grounded context independently for each location and labels them Location A and Location B.
5. The question passes the same moderation and comparison-aware scope checks used by single-location analysis.
6. The analyst explains meaningful differences, ties, trade-offs, and conditional recommendations without forcing a winner.

Questions are first sent to `omni-moderation-latest`. A flagged result returns a fixed plain-text refusal and skips later model calls. Safe questions then use the environment-selected `OPENAI_MODEL` for a non-streaming structured scope decision with low reasoning, low verbosity, a 200-token ceiling, and `store: false`. The scope permits location scores, nearby amenities, transport, rent evidence, daily routines, renter priorities, trade-offs, and relevant facts to verify; it rejects unrelated general assistance, content generation, and instruction-override attempts. A rejected question receives a fixed plain-text refusal and skips answer generation. Screening failures stop the request with a safe 502 or 504 response rather than bypassing a check.

The answer system instruction independently enforces the same rental-location boundary, requires answers to use supplied data, refuses unsupported claims, avoids promising external searches, connects evidence to practical renter implications, and distinguishes facts from interpretation. Answer requests use the environment-selected `OPENAI_MODEL`, xhigh reasoning effort, high text verbosity, a 1,200-token output ceiling, a 20-second timeout, `store: false`, and streaming. The server converts OpenAI's provider-specific event stream into plain UTF-8 text; the browser appends each chunk to one assistant message and shows a cursor until the stream finishes. ConversationProvider retains messages and drafts in memory per location or ordered comparison pair across workspace navigation. The workspace is keyed by the current user identity, so changing between anonymous and authenticated sessions remounts the search and conversation state. Reloading or leaving the workspace starts fresh conversations. Route departure aborts active replies, preserves their text, and marks them interrupted. Clear conversation removes only the current transcript and draft. Switching mobility profiles preserves both transcripts and drafts, including a pending answer. Each answer labels the profile captured at submission; subsequent questions use the newly selected profile. Enter sends a question and Shift+Enter inserts a newline.

Current MVP boundaries: no RAG, web search, durable conversation storage, model memory of earlier questions, autonomous tools, or map actions. Each request still sends one question; visible transcript retention does not add model conversation memory.

## Persistence and Cache

The current Prisma schema contains nine models:

| Model             | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| SearchLocation    | Shared canonical searched location keyed by rounded coordinates            |
| ScoreSnapshot     | Timestamped overall score, category scores, and place groups               |
| UserSearch        | Per-user recent-search relationship                                        |
| UserSavedLocation | Per-user saved-location relationship                                       |
| RentalReport      | Per-user known weekly rent evidence keyed by location and property profile |
| User              | Better Auth identity                                                       |
| Session           | Better Auth database session                                               |
| Account           | Password or OAuth provider account                                         |
| Verification      | Better Auth verification records                                           |

Important behaviour:

- SearchLocation and ScoreSnapshot are shared across users.
- UserSearch and UserSavedLocation are scoped to one user.
- Anonymous searches can warm the shared cache but are not added to history.
- Saved locations survive snapshot deletion; they temporarily show without a score until searched again.
- ScoreSnapshot currently stores scores and groups as JSON strings. PostgreSQL Json columns are a possible cleanup, not a current requirement.
- The seven-day TTL controls reuse only; expired rows are not automatically deleted.
- Database failures degrade to live Google retrieval. This preserves search availability but can increase provider usage without a visible database warning.

## Authentication and User Data

Better Auth uses the Prisma adapter and the same PostgreSQL database as the application.

- Email/password sign-up and sign-in are enabled.
- New email/password accounts must verify their address before signing in.
- Verification and password-reset messages are delivered through Resend from `auth.viva.monster`.
- Reset requests use generic browser wording, one-hour links, and a three-request-per-15-minute limit.
- A successful password reset revokes the user's existing sessions.
- Google OAuth is configured when both Google credentials are available.
- Password hashing and session cookies are managed by Better Auth.
- OAuth access and refresh token material is encrypted before database storage.
- BETTER_AUTH_SECRET must remain stable within an environment.
- Environments sharing one database must share the same secret or encrypted OAuth material becomes unreadable.
- Email sign-in uses a full-page redirect after success so the session is reloaded rather than reused from stale client state.
- Favourites return 401 when signed out.
- History is session-aware and returns an empty list when signed out.

Google OAuth redirects the browser to Google; this application never receives the user's Google password.

The login page currently always shows "Continue with Google." If OAuth credentials are intentionally omitted, the button is still visible and the flow will fail. Hiding or disabling it from server-provided configuration is deferred.

## Map and Interaction Status

LocationMap uses the browser-exposed NEXT_PUBLIC_MAPS_API_KEY and the Google Maps JavaScript API.

Current behaviour:

- one labelled marker for the searched location;
- category-coloured amenity markers;
- larger markers for locally recognised brand matches;
- up to eight initial markers per category, with on-demand marker creation when a later list row is selected;
- only one custom amenity popup open at a time;
- popup name, category, distance, and address;
- a Google Maps search link for non-transport amenities using query and Google Place ID;
- no custom Google Maps link for transport because Transitland stop IDs are not Google Place IDs;
- built-in fullscreen control;
- list-row selection that pans, opens the popup, and scrolls to the map when necessary;
- a floating return button after automatic scrolling.

The application uses semantic colour tokens for light and dark themes. Theme preference is saved in localStorage, follows the operating system on first visit, is applied before hydration, and synchronises across tabs. Google map colour scheme is a construction-time option, so the map and its markers are recreated when the theme changes. Custom popup surfaces, text, close control, and links are styled for both themes.

## Environment Configuration

Application variables:

| Variable                 | Required                   | Exposure and purpose                                                                               |
| ------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------- |
| DATABASE_URL             | Yes                        | Server-only PostgreSQL connection                                                                  |
| GOOGLE_MAPS_API_KEY      | Yes                        | Server-only autocomplete, geocoding, place retrieval, elevation, and temporary transit routing     |
| GEOAPIFY_API_KEY         | Yes                        | Server-only indicative driving time to Melbourne CBD                                               |
| OPENAI_API_KEY           | For AI analyst             | Server-only OpenAI credential used by the grounded location chat                                   |
| OPENAI_MODEL             | For AI analyst             | Server-only model selected by the environment; the tracked Docker example defaults to `gpt-5-mini` |
| NEXT_PUBLIC_MAPS_API_KEY | For live map               | Browser-visible Maps JavaScript key                                                                |
| BETTER_AUTH_SECRET       | Yes                        | Server-only stable auth and token-encryption secret                                                |
| BETTER_AUTH_URL          | Yes                        | Canonical application origin for auth                                                              |
| RESEND_API_KEY           | When auth email is enabled | Server-only Resend API key for verification and password-reset messages                            |
| AUTH_EMAIL_FROM          | When auth email is enabled | Verified sender identity used for authentication messages                                          |
| TRANSITLAND_API_KEY      | No                         | Server-only bus-stop and service enrichment                                                        |
| GOOGLE_CLIENT_ID         | No                         | Google OAuth; email/password works without it                                                      |
| GOOGLE_CLIENT_SECRET     | No                         | Google OAuth; server-only                                                                          |

NEXT_PUBLIC_MAPS_API_KEY is public by design. Restrict it by HTTP referrer and to the Maps JavaScript API. Restrict the server key to the required server APIs and do not apply browser-referrer restrictions to server calls.

### Recommended development setup

Use a dedicated Neon development branch and Vercel Development variables:

```bash
npx vercel@latest link
npx vercel@latest env pull .env.local --environment=development
npx vercel@latest env run -- npm run db:migrate:deploy
npm run dev
```

Operational rules:

- env pull replaces .env.local.
- Put manually managed overrides in .env.development.local.
- Development values that must be pulled cannot be Vercel write-only Sensitive values.
- Run standalone Prisma commands through vercel env run when DATABASE_URL only exists in Vercel-managed local configuration.
- Keep development and production on separate Neon branches and separate secrets where possible.
- Never commit .env files.

Google OAuth callback URLs end in /api/auth/callback/google. Configure one authorised callback for localhost and one for every deployed origin.

## Database Changes and Cache Invalidation

- postinstall runs prisma generate and does not connect to a database.
- npm run build runs only next build and never applies migrations.
- npm run db:migrate is for interactive development migration work.
- npm run db:migrate:deploy applies committed migrations to a target database.
- Vercel builds do not migrate the production database automatically.
- Docker Compose runs a one-shot migrate service after PostgreSQL becomes healthy and before the application starts.

Before releasing schema-dependent code, explicitly deploy its committed migration to the target database.

Clear ScoreSnapshot deliberately when changing:

- scoring formulas or constants that affect stored canonical scores;
- category definitions or provider fields that affect stored place groups;
- filtering, deduplication, or retrieval behaviour that makes old groups incompatible.

Do not delete UserSavedLocation merely to invalidate scores.

## Deployment

### Vercel and Neon

- Vercel hosts the application and deploys main.
- Neon supplies separate hosted PostgreSQL branches for development and production.
- Environment variables are scoped in the linked Vercel project.
- Database migration remains a separate explicit release operation.

### Docker Compose

docker-compose.yml starts:

1. db: PostgreSQL 17 with a persistent db-data volume;
2. migrate: one-shot prisma migrate deploy;
3. app: the standalone Next.js server.

The Docker image uses Node 22 slim and installs OpenSSL for Prisma. NEXT_PUBLIC_MAPS_API_KEY is a build argument because Next.js includes it in the browser bundle; changing it requires rebuilding the image.

## Validation and CI

GitHub Actions runs on pushes to main and pull requests targeting main:

1. npm ci
2. npm run format:check
3. npm run lint
4. npm run typecheck
5. npm run test
6. npm run build with non-secret placeholder configuration

The current 111-test suite across 21 files covers:

- scoring behaviour and invariants;
- formatting, coordinate parsing, distance, and time utilities;
- API-envelope validation;
- derived indicators;
- favourites and rent-estimate route behavior;
- authentication email configuration and delivery callbacks;
- community-rent medians, adaptive radii, report upserts, and profile suggestions;
- CBD driving/transit response parsing and Melbourne daylight-saving calculations;
- grounded AI context construction, OpenAI request configuration, streamed response parsing, text-chunk accumulation, and failure mapping;
- single-location and authenticated saved-location comparison chat routes;
- analyst request payloads and rental hook API boundaries;
- the invariant that the car-owner profile never lowers category or overall scores;
- score-priority presets: each sums to 100, Balanced matches the original scores, and presets change only the overall score.

The tests mock provider, auth, or database dependencies where appropriate. CI does not require a live database or external network calls.

## Known Gaps and Risks

### Immediate correctness and security

- Public rent estimates currently reveal a median with only one or two reports. A one-report median is that contributor's exact submitted rent, and repeated nearby submissions from one account can influence an area estimate.
- Google OAuth remains visibly available when its credentials are absent.

### Reliability and operations

- No application-level rate limiting on provider-backed search, CBD, AI analyst, or authenticated rent-contribution routes.
- /api/cbd-travel and /api/terrain prevent response caching and call their providers on every request, creating a quota and cost-exposure risk. Terrain never changes, so it is a good candidate for storage if usage grows.
- No structured logging, monitoring dashboard, tracing, or error-tracking integration.
- A database outage silently falls back to live Google calls and can increase quota usage.
- Provider calls run within the request lifecycle; there are no background jobs or retries.
- Provider pricing, quotas, and result quality remain external constraints.

### Product and data

- Straight-line distances are not route-aware.
- Planned housing, safety, education, population, and development datasets are not implemented.
- Community rent figures are user-reported, have no moderation workflow, and are not an official rental dataset or valuation.
- Category baselines and scoring constants are manually calibrated.
- The result is a convenience indicator, not a rental recommendation or official valuation.

### Testing

- No browser suite or browser-test dependency is committed.
- No live database integration suite.
- No complete authentication-flow tests.
- No component or browser test covering rent-form state across multiple searched locations.
- POST /api/rent-estimates, /api/cbd-travel, and /api/terrain do not have focused route tests.
- Limited cache-expiry and provider-failure coverage.

## Roadmap

Priorities are intentionally ordered around current needs rather than speculative scale.

### 1. Correctness and route hardening

- Require a minimum number of distinct contributors before publishing a community rent median.
- Hide or disable Google sign-in when OAuth is not configured.
- Add lightweight rate limiting to provider-backed routes, AI analysis, and rent contributions.

### 2. Reliability and test coverage

- Add focused tests for cache hits, expiry, persistence failure, and provider errors.
- Add authentication-flow tests and broader route authorisation coverage.
- Add one browser smoke flow covering search, map selection, save, and comparison.
- Add structured error reporting before broader usage.

### 3. Account completeness

- Complete the manual password-reset inbox, old/new password, link replay, and session-revocation checks.
- Account settings and deletion.

The beginner-oriented implementation plan for the first two items is in
[docs/auth-email-verification-password-reset-plan.md](./docs/auth-email-verification-password-reset-plan.md).

### 4. Better location evidence

- Route-aware walking times.
- More reliable transit frequency and service coverage.
- Official rent trends plus schools, childcare, safety, population, and planning datasets from suitable sources.

### 5. Continued interface refinement

- Accessibility and keyboard review.
- Mobile map and long-list interaction review.
- Clearer data freshness and provider-degradation messaging.

## Personal-Project Engineering Rule

This repository is a personal project. Prefer the smallest clear implementation that solves a real current requirement.

- Reuse existing types, functions, and patterns.
- Keep one canonical shared type rather than parallel DTOs.
- Keep types local when they describe only one component or hook.
- Add abstractions only when they remove actual duplication or protect a necessary boundary.
- Preserve security, correctness, and data integrity without importing enterprise process or hypothetical scale.
- Record current decisions here; do not turn this file back into a chronological debugging log.

## Maintenance Checklists

### Before committing application changes

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Use checks proportionate to the change during development, then run the full set before a release or broad refactor.

### Before releasing a schema change

1. Create and test the migration against the development database.
2. Commit the migration with the dependent code.
3. Apply npm run db:migrate:deploy to the target database.
4. Deploy the application.

### Before changing scoring or retrieval

1. Verify the change against representative stored results.
2. Update focused tests.
3. Decide whether existing ScoreSnapshot rows are compatible.
4. Invalidate snapshots only in the intended environments when required.
5. Leave saved-location relationships intact.
