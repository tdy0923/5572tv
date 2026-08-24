---
feature: rsc-migration
status: delivered
specs: []
plans:
  - docs/compose/plans/2026-06-28-rsc-migration.md
branch: main
commits: (uncommitted)
---

# RSC Migration — Final Report

## What Was Built

Converted the home page (`/`) from a monolithic 2153-line `'use client'` component into a Server Component + Client Component split. The Server Component (`page.tsx`, 70 lines) fetches trending data and short drama recommendations on the server, then passes them as initial data to the Client Component (`HomeClient.tsx`, 2157 lines). This eliminates the client-side waterfall of JS download → hydration → API request by providing data at render time.

## Architecture

```
src/app/page.tsx           → Server Component (async)
src/components/HomeClient.tsx  → Client Component ('use client')
src/hooks/useHomePageQueries.ts → accepts initialData for TanStack Query
```

**Data flow:**

1. `page.tsx` calls `getInitialData()` which uses `fetch` to hit `/api/trending` and `/api/shortdrama/recommend` in parallel on the server
2. Response is transformed to `HomePageData` shape and passed as `initialTrendingData` prop to `<HomeClient>`
3. `HomeClient` passes it to `useHomePageQueries(initialTrendingData)`, which uses TanStack Query's `initialData` option
4. TanStack Query renders with server data immediately; background refetch happens after `staleTime` (2 min for trending, 5 min for short dramas)

**Key interfaces:**

- `HomePageData` (in `useHomePageQueries.ts`): `{ hotMovies, hotTvShows, hotVarietyShows, hotAnime, hotShortDramas }`
- `HomeClientProps`: `{ initialTrendingData?: HomePageData }`

### Design Decisions

- **Server fetches API routes directly** — reuses the existing `/api/trending` and `/api/shortdrama/recommend` endpoints with the same transform logic, avoiding duplicated data source logic.
- **TanStack Query `initialData`** — rather than manual cache insertion, we use TanStack Query's built-in `initialData` option. This keeps the cache consistent and still allows client-side refetching.
- **`cache: 'no-store'`** — ensures the server always gets fresh data on demand, and the page stays dynamic.

## Usage

No user-facing changes. The page renders identically. All existing features (tabs, favorites, reminders, history, banner, recommendations, calendar, scroll-to-continue, announcement modal) work as before.

The only difference is improved First Contentful Paint: initial data is streamed with the server response instead of requiring an additional client API round-trip.

## Verification

- `npx tsc --noEmit` — zero errors
- `npx next build` — successful compilation, all 170 pages generated
- All existing interactive features preserved (no prop/behavior changes to client components)

## Journey Log

- [lesson] The existing code already had a `HomeClient` function internally; extracting it was straightforward. The main challenge was matching TanStack Query's `initialData` type to the query function's return type (transformed data, not raw API response).
- [lesson] Server Component cannot import client-side modules (e.g., those referencing `window`, `localStorage`, `navigator`). All such imports must stay in the Client Component.

## Source Materials

| File                                             | Role                | Notes    |
| ------------------------------------------------ | ------------------- | -------- |
| `docs/compose/plans/2026-06-28-rsc-migration.md` | Implementation plan | Complete |
