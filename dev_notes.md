# Development Notes

## Purpose of This File

This is the technical source of truth for the repository. It records the current architecture, implementation status, scoring model, operational setup, known gaps, and roadmap.

The README is intentionally general. Historical debugging stories, superseded designs, temporary calibration output, and completed migration diaries do not belong in either document unless they still affect current operation.

## Current Repository Status

Status reviewed against the repository on 2026-08-22.

| Area | Current state |
| --- | --- |
| Product | Deployed functional prototype |
| Public application | https://rent-score-prototype.vercel.app/ |
| Primary branch | `main`; Vercel auto-deploys changes pushed to it |
| Application shape | Full-stack Next.js application in one repository |
| Persistence | PostgreSQL through Prisma |
| Authentication | Email/password and Google OAuth through Better Auth |
| Quality gates | ESLint, TypeScript, Vitest, and production build |
| Automated tests | 53 tests across 10 test files |
| Production readiness | Not production-ready; hardening gaps are listed below |

The core renter workflow is implemented:

1. Search an Australian address or suburb.
2. Geocode the query and retrieve nearby places.
3. Calculate category and overall scores for a no-car or car-owner profile.
4. Review amenities, derived indicators, CBD travel, community rent evidence, and the interactive map.
5. Sign in to keep history, save locations, compare two saved results, and submit known weekly rents.

The product direction remains amenities-first. Scores are compact summaries; nearby places, map context, and practical indicators carry most of the decision detail.

## Feature Status

### Implemented

- Australian address autocomplete and geocoding.
- Eight amenity categories with category-level filtering and deduplication.
- No-car and car-owner scoring profiles.
- Seven-day shared result cache.
- Interactive Google map with searched-location and amenity markers.
- Fullscreen map control.
- List-to-map selection, automatic map scrolling, and a return-to-row button.
- Theme-aware map, markers, and custom popup styling.
- Google Maps links in non-transport amenity popups.
- Optional Transitland bus-stop, route, destination, and departure enrichment.
- Derived walkability, transit, density, convenience, and car-reliance indicators.
- Direct distance, rounded Geoapify driving time, and usual weekday 8am public-transport time to Melbourne CBD.
- Radius-based community median rent estimates for matching property type and bedroom count.
- Authenticated rent reporting with one updatable report per user/location/property combination.
- The latest rent report for a signed-in user and searched location is returned so the form can restore it.
- When a new location's default profile is empty, the strongest nearby property/bedroom group within 10 km is selected automatically.
- Persistent light and dark themes across the main and login views.
- Better Auth email/password accounts and Google OAuth.
- Per-user recent searches and saved locations.
- Two-location comparison from saved results.
- PostgreSQL persistence on Neon for hosted environments.
- Vercel deployment and analytics.
- Docker Compose deployment with local PostgreSQL and automatic migration application.
- GitHub Actions quality checks.

### Partial or Deferred

- Population, school, childcare, safety, and development data are placeholders only. Rent data is community-reported rather than an official market dataset.
- Walkability uses straight-line estimates, not route-aware walking times.
- Account email verification is implemented and manually verified end to end with the Resend domain `auth.viva.monster`. Password reset is implemented with its manual inbox/password check pending. Account settings and account deletion are not implemented.
- Application-level rate limiting, structured logging, monitoring, and error tracking are not implemented.
- Automated coverage does not yet include full authentication, database-cache integration, provider failures, or browser end-to-end flows.

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

| Layer | Current implementation |
| --- | --- |
| Framework | Next.js 16.2.6 App Router |
| UI | React 19.2.4 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 plus semantic tokens in app/globals.css |
| Fonts | Geist and Geist Mono through next/font |
| Database | PostgreSQL |
| ORM | Prisma 6.19.3 |
| Authentication | Better Auth 1.6.23 with Prisma adapter |
| Maps and places | Google Maps JavaScript API, Places API (New), and Geocoding API |
| Transport enrichment | Transitland v2 REST API, optional |
| Analytics | Vercel Analytics |
| Tests | Vitest 4.1.10 |
| Static checks | ESLint 9 and TypeScript |
| Hosted deployment | Vercel with Neon PostgreSQL |
| Container deployment | Node 22 slim application image and PostgreSQL 17 |
| CI runtime | GitHub Actions with Node 20 |

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
    places/              Cache, providers, scoring, and persistence coordinator
    rent-estimates/       Community rent estimates and contributions
  components/            Dashboard, map, auth, theme, scores, and result views
  hooks/                 Autocomplete, search, and saved-search controllers
  lib/
    maps/                 Browser-only Google Maps integration
    services/             Google, Transitland, and persistence services
    api.ts                Runtime API-envelope validation
    auth.ts               Better Auth server configuration
    categories.ts         Category metadata and profile weights
    indicators.ts         Pure derived-indicator calculations
    scoring.ts            Pure scoring and distance calculations
    types.ts              Shared domain and API types
  login/                  Sign-in and sign-up page
  layout.tsx              Metadata, fonts, analytics, and theme bootstrap
  page.tsx                Main client composition root
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
- **app/lib/types.ts** owns shared domain contracts. Local component or hook state types remain local when no other module needs them.
- **app/lib/api.ts** validates the common success/error envelope before API data enters UI state.
- **app/lib/maps/googleMaps.ts** is marked client-only and owns SDK loading, marker construction, popup HTML escaping, and map-specific types.

This structure is sufficient for the current project. Do not add repositories, dependency-injection layers, duplicate DTOs, generic state frameworks, or other abstractions without a concrete current need.

## Search and Data Flow

### Browser flow

1. useAutocomplete waits 250 ms after input, requests /api/autocomplete, and supports keyboard selection.
2. Submitting the form requests /api/geocode.
3. useLocationSearch requests /api/places with coordinates and location metadata.
4. CbdTravelCard and RentalInsights independently request /api/cbd-travel and /api/rent-estimates for the matched location.
5. The client validates each API envelope before updating result state.
6. Older autocomplete, geocode, places, CBD-travel, and rent-estimate requests are aborted so stale responses cannot overwrite newer actions.

### Places route flow

1. Coordinates are rounded to four decimal places to form a shared cache key.
2. /api/places checks for the newest snapshot younger than seven days.
3. A cache hit returns stored place groups and recalculates the requested profile score without calling Google.
4. A cache miss retrieves all categories, filters and deduplicates places, calculates the requested score, and stores a canonical no-car snapshot.
5. If the visitor is signed in, the location is upserted into that user's recent-search history.
6. Cache or persistence failures are logged and do not block a live provider result.

Profile changes recalculate scores in the browser from the existing place groups. They do not call /api/places again or recreate the map.

## API Routes

| Route | Access | Responsibility |
| --- | --- | --- |
| GET /api/autocomplete | Public | Australian Google Places suggestions |
| GET /api/geocode | Public | Address geocoding and provider error mapping |
| GET /api/places | Public, session-aware | Cache lookup, provider retrieval, scoring, snapshot save, optional history write |
| GET /api/history | Public, session-aware | Current user's recent searches; signed-out users receive an empty list |
| GET /api/favourites | Signed in | Current user's saved locations |
| POST /api/favourites | Signed in | Save a known location |
| DELETE /api/favourites | Signed in | Remove a saved location |
| GET /api/compare | Public at route level | Return the newest stored score snapshots for two location IDs |
| GET /api/cbd-travel | Public | Direct distance, Geoapify driving, and Google public-transport estimates to Melbourne CBD |
| GET /api/rent-estimates | Public | Like-for-like community median rent within an adaptive 1–10 km radius |
| POST /api/rent-estimates | Signed in | Create or update the caller's rent report for a location/property combination |
| /api/auth/[...all] | Better Auth | Sign-up, sign-in, sign-out, sessions, and OAuth callbacks |

The comparison UI only offers the signed-in user's saved locations, but /api/compare does not currently authenticate or verify ownership. Protecting that route is an outstanding hardening task.

CBD driving calls use the server-only `GEOAPIFY_API_KEY`, request free-flow
traffic, and round the result to the nearest five minutes. Public transport
temporarily uses the server-only `GOOGLE_MAPS_API_KEY` and a representative
weekday at 8:00 am in `Australia/Melbourne`. The browser map key is never used
for these web-service requests. Route durations are fetched per search and are
not stored in the database.

Community rent estimates use reports with the same property type and bedroom
count. The service selects the smallest 1, 3, 5, or 10 km radius containing at
least three reports; when fewer exist within 10 km, it currently returns an
early-data median. A signed-in contribution is upserted by user, rounded
location, property type, and bedroom count so resubmitting that combination
updates the existing row.

## Place Retrieval and Categories

Category configuration lives in app/lib/categories.ts and is the single source of truth for labels, search radii, colour classes, rating baselines, brand terms, included place types, excluded primary types, and profile weights.

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

### Lifestyle weights

Each profile sums to 100.

| Category | No car | Car owner |
| --- | ---: | ---: |
| Shopping Centres | 8 | 13 |
| Groceries | 22 | 18 |
| Food & Cafes | 14 | 12 |
| Transport | 28 | 8 |
| Health | 15 | 15 |
| Fitness & Recreation | 10 | 10 |
| Fuel & Automotive | 0 | 14 |
| Services | 3 | 10 |

The overall score is the weighted average of the active category scores. No-car is the default and canonical stored profile. Raw place groups are retained in the snapshot, so another profile can be recalculated without new provider calls.

Any scoring or retrieval change that would make stored place groups or scores misleading requires deliberate ScoreSnapshot invalidation in each intended environment.

## Derived Indicators

app/lib/indicators.ts derives five indicators from the current place groups and category scores:

- **Walkability:** estimated minutes at 80 metres per minute for key destinations.
- **Transit access:** transport score label, closest distance, and available departure count.
- **Amenity density:** total place count across current groups.
- **Daily convenience:** average of groceries, food, health, services, and shopping scores.
- **Car reliance:** estimate based on core categories beyond 1.2 km, with a small fuel-score offset.

The visible planned list is not live data:

- population density;
- schools and childcare;
- safety;
- planned development.

## AI Location Analyst

The result page includes a lightweight single-location chat panel. It explains the deterministic application data rather than replacing the scoring system.

Request flow:

1. `/api/places` returns the persisted `SearchLocation` id with the score result.
2. The client sends that id, the current mobility profile, and one question to `POST /api/locations/[propertyId]/chat`.
3. The server loads the latest stored place groups and recomputes scores for the selected profile.
4. The context builder keeps the score breakdown and up to five nearest amenities per category.
5. The analyst sends that structured context to the OpenAI Responses API and returns only the answer text.

The system instruction requires answers to use supplied data, refuse unsupported claims, avoid promising external searches, and distinguish facts from interpretation. The request sets `store: false`, disabling storage for later retrieval through the Responses API. Conversation messages live only in the current browser component and reset when the location or mobility profile changes.

Current MVP boundaries: no RAG, web search, persistent conversation history, autonomous tools, map actions, or property comparison chat.

## Persistence and Cache

The current Prisma schema contains nine models:

| Model | Purpose |
| --- | --- |
| SearchLocation | Shared canonical searched location keyed by rounded coordinates |
| ScoreSnapshot | Timestamped overall score, category scores, and place groups |
| UserSearch | Per-user recent-search relationship |
| UserSavedLocation | Per-user saved-location relationship |
| RentalReport | Per-user known weekly rent evidence keyed by location and property profile |
| User | Better Auth identity |
| Session | Better Auth database session |
| Account | Password or OAuth provider account |
| Verification | Better Auth verification records |

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

| Variable | Required | Exposure and purpose |
| --- | --- | --- |
| DATABASE_URL | Yes | Server-only PostgreSQL connection |
| GOOGLE_MAPS_API_KEY | Yes | Server-only autocomplete, geocoding, place retrieval, and temporary public-transport routing |
| GEOAPIFY_API_KEY | Yes | Server-only indicative driving time to Melbourne CBD |
| OPENAI_API_KEY | For AI analyst | Server-only OpenAI credential used by the grounded location chat |
| OPENAI_MODEL | For AI analyst | Server-only model name; development currently uses `gpt-5-mini` |
| NEXT_PUBLIC_MAPS_API_KEY | For live map | Browser-visible Maps JavaScript key |
| BETTER_AUTH_SECRET | Yes | Server-only stable auth and token-encryption secret |
| BETTER_AUTH_URL | Yes | Canonical application origin for auth |
| RESEND_API_KEY | When auth email is enabled | Server-only Resend API key for verification and password-reset messages |
| AUTH_EMAIL_FROM | When auth email is enabled | Verified sender identity used for authentication messages |
| TRANSITLAND_API_KEY | No | Server-only bus-stop and service enrichment |
| GOOGLE_CLIENT_ID | No | Google OAuth; email/password works without it |
| GOOGLE_CLIENT_SECRET | No | Google OAuth; server-only |

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
2. npm run lint
3. npx tsc --noEmit
4. npm test
5. npm run build with non-secret placeholder configuration

The current 53-test suite across 10 files covers:

- scoring behaviour and invariants;
- formatting, coordinate parsing, distance, and time utilities;
- API-envelope validation;
- derived indicators;
- favourites and rent-estimate route behavior;
- authentication email configuration and delivery callbacks;
- community-rent medians, adaptive radii, report upserts, and profile suggestions;
- CBD driving/transit response parsing and Melbourne daylight-saving calculations.

The tests mock provider, auth, or database dependencies where appropriate. CI does not require a live database or external network calls.

## Known Gaps and Risks

### Immediate correctness and security

- RentalInsights restores a saved or suggested property profile only for the first searched location in its component lifetime. Form values and feedback can carry into a later location until this state is scoped per location.
- Public rent estimates currently reveal a median with only one or two reports. A one-report median is that contributor's exact submitted rent, and repeated nearby submissions from one account can influence an area estimate.
- /api/compare does not authenticate the caller or verify that both location IDs belong to the caller's saved list.
- The cache badge tooltip still says "within the last 24 hours" even though the current cache TTL is seven days.
- Google OAuth remains visibly available when its credentials are absent.

### Reliability and operations

- No application-level rate limiting on provider-backed search/CBD routes or authenticated rent contributions.
- /api/cbd-travel prevents response caching and can call both Geoapify and Google Routes on every request, creating a quota and cost-exposure risk.
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

- No browser end-to-end suite.
- No live database integration suite.
- No complete authentication-flow tests.
- No component or browser test covering rent-form state across multiple searched locations.
- POST /api/rent-estimates and the /api/cbd-travel route do not have focused route tests.
- Limited cache-expiry and provider-failure coverage.

## Roadmap

Priorities are intentionally ordered around current needs rather than speculative scale.

### 1. Correctness and route hardening

- Reset RentalInsights state for each searched location.
- Require a minimum number of distinct contributors before publishing a community rent median.
- Update the cache badge tooltip from 24 hours to seven days.
- Require a session in /api/compare and verify both locations are saved by that user.
- Hide or disable Google sign-in when OAuth is not configured.
- Add lightweight rate limiting to provider-backed routes and rent contributions.

### 2. Reliability and test coverage

- Add focused tests for cache hits, expiry, persistence failure, and provider errors.
- Add authentication-flow and comparison-authorisation tests.
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
npm run lint
npx tsc --noEmit
npm test
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

## Rental Report Production Incident (2026-08-12)

- **Symptom:** The community-rent form and `/api/rent-estimates` returned HTTP 500 in production.
- **Cause:** The application code expected `RentalReport`, but its committed migration had not been applied to the database used by the live Vercel deployment. Vercel builds intentionally do not run migrations automatically.
- **Evidence:** Production logs showed Prisma error `P2021`: `public.RentalReport` did not exist. Focused tests passed and the development database was already up to date.
- **Fix:** A one-time production build ran `prisma migrate deploy` before `next build`, creating the missing table, indexes, and foreign key. The normal `next build` command was restored afterward.
- **Verification:** The public rental-estimate endpoint returned `ok: true`, and a signed-in rental report saved successfully.
- **Prevention:** Follow the schema-release checklist above and apply committed migrations to the target database before deploying schema-dependent code.
