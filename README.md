# CheapTripFinder

Find destinations two friends in different cities can fly to cheaply, on the
same dates, ranked by combined price + weather.

> **Status:** v0.1 foundation. Wrapper, algorithm, fixtures, and tests are
> production-shaped. The UI is a deliberate stub — wired up, but no shadcn,
> no autocomplete, no streaming progress yet. See "Roadmap" below.

## Why this exists

Two friends in Vienna and Berlin want a weekend together somewhere warm and
cheap. The cheapest fares from "Vienna" often actually leave from Bratislava
(BTS) — a 75-minute bus ride. The cheapest from "Berlin" might leave from
Leipzig. Skyscanner-style searches that pin you to one airport per city
miss this. This app explicitly searches *regions* (sets of airports) and
tells you which airport gave the best price.

## Setup

```bash
pnpm install        # or npm install
pnpm dev            # http://localhost:3000
pnpm test           # run the algorithm + integration tests
pnpm typecheck      # strict TS, should report 0 errors
```

By default everything runs **offline** against fixtures in
`src/lib/__fixtures__/`. To hit the real APIs:

```bash
RYANAIR_MODE=live-fallback pnpm dev   # try live, fall back to fixtures
RYANAIR_MODE=live pnpm dev            # always live (will fail if API is down)
WEATHER_MODE=live pnpm dev            # real Open-Meteo (free, no key)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (src/app/page.tsx)                                          │
│  Form → POST /api/search → render top results                   │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────┐
│  POST /api/search (src/app/api/search/route.ts)                 │
│  Validates input (Zod) · orchestrates wrappers · runs algorithm │
└───┬─────────────────────────────────┬───────────────────────────┘
    │                                 │
┌───▼──────────────────────┐   ┌──────▼──────────────────────────┐
│ Ryanair wrapper          │   │ Open-Meteo wrapper              │
│ src/lib/ryanair/         │   │ src/lib/weather/                │
│ - schemas.ts (Zod)       │   │ - getWeather() / batch          │
│ - client.ts (fetch+cache)│   │ - synthetic fallback for dev    │
│ - fixtures mode default  │   │                                 │
└──────────────────────────┘   └─────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Pure algorithm (src/lib/algorithm/index.ts) — no I/O           │
│ cheapestPerDestination → intersectDestinations →               │
│ scoreWeather → rankResults                                     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Region presets (src/lib/regions/index.ts) — 8 regions          │
│ Vienna, Berlin, Munich, Frankfurt, Milan, London, Paris,       │
│ Barcelona. Each is a list of {iata, name, groundMinutes}.      │
└────────────────────────────────────────────────────────────────┘
```

The deliberate split: **all I/O is in wrappers, all logic is in pure
functions, and the API route is the thin glue between them.** That's why
the algorithm has 15 unit tests — none of them touch the network or the
filesystem.

## Project layout

```
src/
├── app/
│   ├── api/
│   │   ├── airports/route.ts    GET — airports + region presets
│   │   └── search/route.ts      POST — main search
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 UI stub
├── lib/
│   ├── __fixtures__/            Hand-crafted Ryanair JSON; matches schema
│   │   ├── airports.json
│   │   └── fares/{VIE,BTS,BER,LEJ}.json
│   ├── __tests__/
│   │   ├── algorithm.test.ts    15 unit tests for pure functions
│   │   └── integration.test.ts  3 wrapper+algorithm e2e tests
│   ├── algorithm/index.ts       Pure functions
│   ├── regions/index.ts         Region presets
│   ├── ryanair/
│   │   ├── client.ts            Wrapper with cache, throttle, modes
│   │   └── schemas.ts           Zod schemas for the unofficial API
│   └── weather/index.ts         Open-Meteo + synthetic fallback
└── types/index.ts               Shared domain types
```

## The unofficial-API risk

Ryanair's `services-api.ryanair.com` endpoints are public but **not
documented** and not stable. They've changed shape in the past and they will
again. This codebase is structured around that reality:

1. **Fixtures are the default.** Dev, tests, and CI never touch the real
   API. Only `RYANAIR_MODE=live` does.
2. **Zod parses everything at the boundary.** A schema change produces a
   loud, localized error in the wrapper — not silent NaNs in your UI.
3. **One wrapper, one cache.** `src/lib/ryanair/client.ts` is the only file
   that knows about the real API. If the response shape changes, the
   schemas update, and the rest of the app keeps working.
4. **Throttling and a realistic User-Agent.** 300ms minimum spacing, one
   retry on failure, Chrome UA. We're a polite citizen.
5. **`live-fallback` mode** quietly degrades to fixtures if the API
   refuses, so the app stays usable through outages.

If you push this to production: add an external monitor on the live mode
that alerts when fixture-fallback triggers. That's your canary for the API
breaking.

## Algorithm details

The core is four pure functions in `src/lib/algorithm/index.ts`. They are
small enough that the JSDoc + the tests are the spec; here's the gist:

1. **`cheapestPerDestination(fares, regionAirports)`** — collapse a flat
   list of fares from many origins into one entry per destination, keeping
   the cheapest. Tie-break on shorter ground time.
2. **`intersectDestinations(regionA, regionB)`** — keep only destinations
   reachable from both regions. (CTA reachable only from VIE? Drop it.)
3. **`scoreWeather(summary)`** — transparent, returns a breakdown:
   - Daily high 18–28 °C → +10; 12–18 or 28–32 → +5; else +0
   - Rain prob <20% → +5; <40% → +2; else +0
   - Sunshine ≥8h → +3; else +0
4. **`rankResults(rows, weather, opts)`** — combined price + a small
   ground-time penalty (€10 per 30min beyond 30min, configurable), then
   `score = -adjustedPrice + weatherScore × weatherWeight`.

`weatherWeight` is in *weather points per EUR*: 0 ignores weather, 1 means
1 weather point ≈ €1, 2 means weather dominates. Sensible defaults — but
if your testing shows weather is barely moving the ranking, raise it.

### Weather-score caveat worth flagging

The thresholds are deliberately simple but tuned for "warm-weather trip"
preferences. Two cases the current scorer handles imperfectly:

- A 14°C high gets +5 ("acceptable") even with 70% rain. For a hiking
  trip that's accurate; for a beach trip it isn't.
- The bands are hard cliffs. 17.9°C scores 5; 18.0°C scores 10.

If you care about either, swap `scoreWeather` for a smoother, preference-
aware version. The pure-function shape makes that a one-file change.

## Known limits

- **One airline.** Ryanair only. The wrapper is structured to grow — see
  the Wizz section below — but no aggregation in v0.1.
- **No fare validation.** We trust the fares Ryanair returns. They may be
  stale by the time the user clicks "book."
- **Country codes for fare destinations are best-effort.** The fares
  endpoint doesn't return ISO codes; we enrich from the airports list,
  but if a destination isn't in that list, the country shows as `XX`.
- **Climate normals are coarse.** For trips >16 days out, weather is from
  long-term climatology, not a real forecast. The `source` field in
  `WeatherSummary` flags this.
- **Single-region weather lookup.** We use the outbound midpoint date from
  region A's chosen fare. If region B leaves on a different date, we
  ignore it. Acceptable for v0.1; revisit if it surprises users.
- **No accessibility audit on the UI stub.** Real keyboard nav, focus
  states, ARIA — when the UI is rebuilt with shadcn, do this then.

## Roadmap (in priority order)

1. **shadcn/ui pass.** Replace the raw inputs with shadcn primitives. Add
   the date-range and dual-slider components from the spec.
2. **Multi-select airport custom mode.** Let users build a region from
   scratch when their city isn't in the presets.
3. **Streaming progress.** Server-Sent Events from `/api/search` so the
   UI can show "Checking VIE… 47 destinations" in real time, as the spec
   describes. Keeps users patient through 10–30s waits.
4. **Per-airport toggles.** "Don't bother showing me BVA, I'm not taking
   a 2-hour bus." Just filter the region's airport list before the
   wrapper calls.
5. **Real flag emoji + weather icons.** Trivial once the shadcn pass is
   in.
6. **Persist last search to URL params.** No DB, just shareable URLs.

## How to add another airline (worked example: Wizz Air)

Wizz Air's unofficial endpoint at `be.wizzair.com/14.10.0/Api/search/...`
returns a similar shape: a list of fares with origin, destination, date,
price. The integration is mechanical:

### 1. Add a new wrapper module

Create `src/lib/wizz/` mirroring `src/lib/ryanair/`:

```
src/lib/wizz/
├── client.ts       # same shape as ryanair/client.ts
├── schemas.ts      # Zod for Wizz's response shape
└── __fixtures__/   # your fixtures (the same file layout)
```

The contract `client.ts` must satisfy:

```ts
// Same exported names as the Ryanair wrapper:
export async function getRoundTripFares(q: RoundTripFaresQuery): Promise<FareOption[]>
export async function getActiveAirports(): Promise<Airport[]>
```

`FareOption` and `Airport` are the **internal** domain types from
`src/types`. As long as the Wizz wrapper translates Wizz's response shape
into those types, no other code in the app needs to know it exists.

### 2. Make the search route call both

In `src/app/api/search/route.ts`, where today there's a single

```ts
import { getRoundTripFares } from '@/lib/ryanair/client';
```

replace it with a small dispatcher:

```ts
import { getRoundTripFares as ryanairFares } from '@/lib/ryanair/client';
import { getRoundTripFares as wizzFares }    from '@/lib/wizz/client';

async function getAllFares(q: RoundTripFaresQuery): Promise<FareOption[]> {
  const [r, w] = await Promise.allSettled([ryanairFares(q), wizzFares(q)]);
  return [
    ...(r.status === 'fulfilled' ? r.value : []),
    ...(w.status === 'fulfilled' ? w.value : []),
  ];
}
```

`Promise.allSettled` is intentional — if one airline's API is down, the
other one's results still flow through. Tag the `FareOption` with an
`airline: 'ryanair' | 'wizz'` field for the UI to show the carrier.

### 3. `cheapestPerDestination` keeps working unchanged

It's a pure function over `FareOption[]`. It doesn't know or care which
airline produced each fare. Multi-airline support falls out for free.

### 4. Update the booking deep-link

The current `buildBookingUrl` in `ryanair/client.ts` is Ryanair-specific.
Move it to the wrapper and have each airline's wrapper produce its own
booking URLs. The `bookingUrl` field on `FareOption` doesn't need to change
shape.

### 5. Tests and fixtures

Copy the fixture pattern. Add Wizz-side scenarios that mirror the Ryanair
ones (cheaper from a secondary airport, only-from-X cases). The integration
test stays valid; add cases verifying that when both airlines offer the
same route, the cheaper wins.

That's the whole pattern. The wrapper-as-boundary discipline is what makes
this cheap to do.

## A note on operational hygiene

This app is structured to be a polite citizen even when running against
the live API:

- 1-hour in-memory cache. Identical query within an hour = cache hit.
- 300ms minimum spacing between requests.
- One retry on transient failure with backoff.
- Realistic Chrome User-Agent.
- Public endpoints only (no scraping signed-in pages).

If you deploy: don't parallelize across many machines hammering Ryanair.
You'll get the IP blocked, and that hurts everyone using this kind of
unofficial API. A single Vercel deployment with the in-memory cache
above is fine. Anything more, add an upstream cache (Vercel KV, Redis).
