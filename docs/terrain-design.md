# Terrain and hilliness (PR #6) design notes

## 1. From requirement to design

The original need: a low-powered car struggles on routes with lots of hills. That breaks down into three questions:

1. **Where does the data come from?** We need the elevation at a latitude and longitude. The project already has a Google key, so the Google Elevation API was chosen: no new account, and up to 512 points per request.
2. **How do we measure "hilly"?** The elevation of one point means little (eastern Melbourne is higher overall, but that does not make it hard to drive). What affects driving is **slope** = height difference ÷ horizontal distance.
3. **Where is the result shown, and does it count towards the score?** It is shown as separate evidence and does not change the score for now (see section 5).

## 2. Files and responsibilities

The path of a request from the browser to Google and back:

```
Details page LocationDetails.tsx
  └─ TerrainCard.tsx          (browser) GET /api/terrain?lat=..&lng=..
       └─ app/api/terrain/route.ts       (server) validates coordinates, consistent error format
            └─ app/lib/services/terrain.ts   (server) builds the request, calls Google, checks the response
                 ├─ app/lib/terrain.ts       (pure) generates 81 sample points
                 └─ app/lib/terrain.ts       (pure) 81 elevations → slope statistics
```

| File                                                  | New/changed | Role                                                                                                 |
| ----------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `app/lib/types.ts`                                    | Changed     | Adds `TerrainLevel` and `TerrainSummary`, one shared contract for server and client                  |
| `app/lib/terrain.ts`                                  | New         | Pure functions: `buildTerrainSamplePoints` for sample points, `summariseTerrain` for slope and level |
| `app/lib/services/terrain.ts`                         | New         | The only place that talks to Google: builds the URL, reads the key, handles Google's error format    |
| `app/api/terrain/route.ts`                            | New         | HTTP entry point: validates parameters, returns `{ ok: true, terrain }` or 400/502                   |
| `app/components/TerrainCard.tsx`                      | New         | Card UI with loading, error and success states; validates the response before showing it             |
| `app/components/LocationDetails.tsx`                  | Changed     | Adds the card to the details page                                                                    |
| `app/lib/terrain.test.ts`, `services/terrain.test.ts` | New         | 9 tests, see section 6                                                                               |
| `dev_notes.md`, `README.md`                           | Changed     | Documentation kept in sync, as AGENTS.md requires                                                    |

**Why the API key stays on the server:** the Elevation call runs in `route.ts` → `services/terrain.ts` with `GOOGLE_MAPS_API_KEY` (a server-side variable). The browser only calls the app's own `/api/terrain` and never sees the key. The Elevation API must be enabled in the Google Cloud project that owns `GOOGLE_MAPS_API_KEY`.

## 3. Algorithm

**Sampling:** from the address, draw a 1.5 km straight line in each of 8 directions (every 45°), with a point every 150 m: 1 + 8 × 10 = 81 points, sent in one request.

Coordinate conversion: 1° of latitude ≈ 111,320 m. A degree of longitude gets shorter away from the equator, so it is multiplied by `cos(latitude)`. At Melbourne's roughly -37.8°, 1° of longitude ≈ 88 km.

**Slope:** for each pair of neighbouring points on a line, `|Δheight| / 150 × 100%`, giving 80 segments. The absolute value is used, so uphill and downhill both count.

**Four outputs:**

- Average slope, which sets the level: < 1.5% flat, < 3% gently rolling, < 5% hilly, ≥ 5% steep
- Steepest segment, so one big hill is not hidden by a flat average
- Share of segments at 5% or more, roughly where small cars start to struggle
- Elevation range: highest point minus lowest point

**Why 1.5 km and 150 m:** 1.5 km is about the first few minutes of a daily drive; 150 m captures ordinary slopes while keeping the point count (81) far below Google's 512-point limit, so one request is enough. These are first-version estimates that can be calibrated with real addresses later.

## 4. Design ideas used

No complex Gang of Four patterns are involved. These ideas follow the project's existing structure:

1. **Layered architecture:** the route only handles HTTP, the service only handles the external API, and the pure module only does the maths. When something breaks, the layer tells you which file to look at. This matches the "Route handlers / Service modules / Pure modules" boundary in dev_notes.
2. **Functional core, imperative shell:** `terrain.ts` has no network calls and no environment variables, so the same input always gives the same output and the tests need no mocks. The side effects (fetch, reading the key) sit in the thin `services/terrain.ts` shell. `scoring.ts` follows the same idea.
3. **Adapter idea:** Google's response format (`status`, `results[].elevation`, and errors that still return HTTP 200) only appears inside the service. Everything outside sees the app's own `TerrainSummary`. Switching data source (for example to Open-Elevation) would change only the service file.
4. **Runtime validation at the boundary:** TypeScript types exist only at compile time. `isTerrainPayload` in `TerrainCard` checks at runtime that the server's JSON really has the expected shape before it goes into state. The project's `readApiResult` handles this consistently.
5. **Lazy loading:** terrain is requested only when the details page opens, so a search on the home page never costs an extra Google call. The CBD travel card works the same way.
6. **Copy the existing pattern instead of abstracting:** `TerrainCard` and `CbdTravelCard` have almost the same structure (loading, AbortController, three states). With only two copies, no shared hook was extracted, because AGENTS.md asks to avoid abstractions for hypothetical needs. If a third similar card appears, a `useLocationFetch` hook would be worth it.

**What AbortController does:** when a user switches addresses quickly, the old request may still be in flight. The `useEffect` cleanup calls `controller.abort()` to cancel it, so an old result never overwrites a new one.

## 5. Why it is not part of the overall score (open to discussion)

- The overall score measures nearby amenities, and it is already stored in `ScoreSnapshot`. Changing the formula would invalidate and recalculate every stored score.
- Hills affect people very differently: small cars, electric cars, cyclists and walkers all differ. Forcing it into one score would make the score harder to explain.
- Showing the raw evidence first lets us check whether the numbers are accurate before deciding whether to weight it (for example only for the car-owner profile).

## 6. What the tests prove

- `terrain.test.ts` (pure): sample points start at the centre and each line reaches 1.5 km; flat ground is flat; a steady 4% slope is hilly; downhill counts too; a single steep segment shows up in "steepest segment" instead of disappearing into the average; the wrong number of points throws.
- `services/terrain.test.ts` (fake fetch): 81 points go in one request with the right URL and key; a `REQUEST_DENIED` from Google throws; no request is sent when the key is missing.

## 7. Known limits and possible next steps

- Straight lines do not follow roads, so the result describes the surrounding land, not the exact slope of a particular road. A more accurate approach would sample along real driving routes (for example to the nearest supermarket or to the CBD) with the Elevation `path` parameter, at the cost of one routing request per route.
- Every details page visit calls Google and the result is not cached. Terrain does not change, so it could be stored in the database if usage grows.
- The AI analyst cannot see terrain data yet; it could be added to its context.
