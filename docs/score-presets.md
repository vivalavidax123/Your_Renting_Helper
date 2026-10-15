# Score-priority presets (PR #7) development log

## 1. Requirement

Everyone used to share one fixed set of weights (transport 28, groceries 22, health 15, and so on). Students, families and commuters care about different things, so the same address is not equally "good" for all of them. The goal is to let users pick a preset and recalculate the overall score from their priorities.

## 2. Key design decisions

| Decision                                                                 | Reason                                                                                                                                   | Cost                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Four fixed presets, no free-form sliders                                 | Presets can be tested with fixed numbers. Sliders would need to handle weights that do not add up to 100, which complicates UI and tests | Users cannot fine-tune weights      |
| A preset changes only how much each category counts, not category scores | It stays independent of No car / Car owner (which controls distance sensitivity), so the 2 × 4 combinations need no extra configuration  | None                                |
| The preset lives in the URL (`?preset=`), not the account                | Same mechanism as the existing `?profile=`; works when signed out; no database change; links are reproducible                            | Users choose again on a fresh visit |
| Balanced is omitted from links                                           | Old links stay unchanged                                                                                                                 | None                                |
| Unknown preset: the browser falls back to Balanced; the API returns 400  | A bad link never breaks the page; the API stays strict with callers                                                                      | A mistyped link gives no warning    |

## 3. Data flow

```
URL ?profile=carFree&preset=family
  └─ ExploreProvider.tsx          reads and validates preset, provides changePreset and scoringParams
       ├─ useLocationSearch.ts    scores in the browser with scorePlaceGroups(groups, profile, preset)
       ├─ page links              keep the current choice through scoringParams
       ├─ ComparePanel.tsx  ──>  GET /api/compare?preset=…        ─> searchStore.getComparisonSide
       └─ AnalystChat       ──>  POST …/chat { preset }           ─> locationAnalysis (the AI sees the same scores)
```

The key point: the database stores **raw place data**, and scores are recalculated each time. Adding presets needed no new Google requests and no cache clearing.

## 4. Files changed

| File                                                                                                          | Role                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `app/lib/categories.ts`                                                                                       | `WeightPreset` type, the four `weightPresets`, `isWeightPreset` / `isWeightProfile` validation, `scoringQuery` for link parameters |
| `app/lib/scoring.ts`                                                                                          | `scorePlaceGroups` takes a third `preset` argument, defaulting to `balanced`                                                       |
| `app/components/PresetPicker.tsx` (new)                                                                       | Four buttons, following the style and behaviour of `MobilityProfile.tsx`                                                           |
| `ExploreProvider.tsx`, `useLocationSearch.ts`                                                                 | Read and write the URL, pass the preset to scoring                                                                                 |
| `ScoreBreakdown.tsx`, `CategoryDetails.tsx`, `LocationHeader.tsx`, `ExploreWorkspace.tsx`, `compare/page.tsx` | Links carry the preset; place the picker                                                                                           |
| `ComparePanel.tsx`, `/api/compare`, `searchStore.ts`                                                          | The comparison uses the same preset                                                                                                |
| `ConversationProvider.tsx`, `AnalystChat.tsx`, `LocationAnalyst.tsx`, both chat routes, `locationAnalysis.ts` | The AI analyst uses the same preset and receives it as `preferences.weightPreset`                                                  |

## 5. What the tests prove

- Every preset adds up to 100, fuel is 0 in each, and every other category has a weight.
- Without a preset the result equals `balanced`, so the old behaviour is unchanged.
- Changing preset changes only the overall score, never category scores. An address with close transport and distant health scores higher under Commuter than Family.
- `isWeightPreset("toString")` is false, so names on the object prototype are never treated as presets.
- The comparison API and both AI APIs pass the preset through to scoring; an unknown preset returns 400.

All 111 tests, lint, type checking and the production build passed at the time; the change was merged after checking the Vercel preview.

## 6. Known limits and possible next steps

- The weights are hand-picked, not calibrated with user data.
- AI answers are labelled with No car / Car owner but not with the preset used.
- A signed-in user's default preset could be added later: read the URL first, then fall back to the account value. This would not require changing the current approach.
