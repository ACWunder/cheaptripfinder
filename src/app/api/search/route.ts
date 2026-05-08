/**
 * POST /api/search
 *
 * Two-phase search:
 *   Phase 1 (discovery): roundTripFares for each origin → list of destinations
 *     each region can reach. Fast (1 call per origin), but returns only ONE
 *     cheapest fare per destination — useless for cross-region date matching.
 *   Phase 2 (calendars): for the top-N candidate destinations, fetch the
 *     daily fare calendar (cheapestPerDay) for every (origin, dest) and
 *     (dest, origin) leg. Build all valid round-trips per region, match
 *     across regions on shared dates (strict | ±1 day). Per destination keep
 *     the cheapest matched pair.
 *
 * Latency: Phase 1 = N origins ≈ 4 calls. Phase 2 = top-N dests × origins ×
 * 2 directions × months. With Ryanair's 300ms throttle, ~10–20s in live mode.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  findBestSharedTrip,
  rankResults,
  type DateMatchMode,
  type IntersectionRow,
} from '@/lib/algorithm';
import { listRegions } from '@/lib/regions';
import {
  getActiveAirports,
  getCheapestPerDay,
  getRoundTripFares,
  shiftIsoDate,
  type DailyFare,
} from '@/lib/ryanair/client';
import { getWeatherBatch } from '@/lib/weather';
import type { Airport, FareOption, IataCode, RegionAirport } from '@/types';

export const maxDuration = 60;

/** Hard cap on the search window. Larger windows fan Phase 2 out into too
 *  many cheapestPerDay calls and make the result set noisy. */
const MAX_SEARCH_WINDOW_DAYS = 14;

function daysSpan(from: string, to: string): number {
  const t1 = Date.parse(`${from}T00:00:00Z`);
  const t2 = Date.parse(`${to}T00:00:00Z`);
  return Math.round((t2 - t1) / 86400000);
}

const SearchInputSchema = z
  .object({
    regionAAirports: z.array(z.string().length(3)).min(1).max(8),
    regionBAirports: z.array(z.string().length(3)).min(1).max(8),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tripDurationDaysMin: z.number().int().min(1).max(30),
    tripDurationDaysMax: z.number().int().min(1).max(30),
    maxPricePerPersonEur: z.number().int().min(20).max(2000),
    weatherWeight: z.number().min(0).max(2),
    dateMatchMode: z.enum(['strict', 'flex1']).default('strict'),
  })
  .refine((v) => daysSpan(v.dateFrom, v.dateTo) <= MAX_SEARCH_WINDOW_DAYS, {
    message: `Suchfenster darf maximal ${MAX_SEARCH_WINDOW_DAYS} Tage umfassen.`,
    path: ['dateTo'],
  });

/** How many candidate destinations from Phase 1 to deeply analyze in Phase 2. */
const PHASE2_TOP_N = 30;

function buildRegionAirportSet(iatas: string[]): RegionAirport[] {
  const allAirports = listRegions().flatMap((r) => r.airports);
  const byIata = new Map(allAirports.map((a) => [a.iata, a]));
  return iatas.map((iata) => {
    const found = byIata.get(iata.toUpperCase());
    if (found) return found;
    return { iata: iata.toUpperCase(), name: iata.toUpperCase(), groundMinutesFromCenter: 60 };
  });
}

function midpointDate(fare: FareOption): string {
  const out = new Date(`${fare.outboundDate}T00:00:00Z`);
  const back = new Date(`${fare.inboundDate}T00:00:00Z`);
  const mid = new Date((out.getTime() + back.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

/** Months that overlap [from, to]. Returns first-of-month YYYY-MM-01 strings. */
function monthsBetween(from: string, to: string): string[] {
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function POST(req: Request): Promise<NextResponse> {
  let parsed;
  try {
    const body = await req.json();
    parsed = SearchInputSchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', detail: (err as Error).message },
      { status: 400 },
    );
  }

  const regionA = buildRegionAirportSet(parsed.regionAAirports);
  const regionB = buildRegionAirportSet(parsed.regionBAirports);

  // ── Phase 1: discovery ────────────────────────────────────────────────────
  const phase1Queries = [...regionA, ...regionB].map((a) => ({
    origin: a.iata,
    outboundDateFrom: parsed.dateFrom,
    outboundDateTo: parsed.dateTo,
    durationDaysMin: parsed.tripDurationDaysMin,
    durationDaysMax: parsed.tripDurationDaysMax,
    maxPriceEur: parsed.maxPricePerPersonEur,
  }));

  let phase1ByOrigin: Map<string, FareOption[]>;
  try {
    const results = await Promise.all(
      phase1Queries.map(async (q) => [q.origin, await getRoundTripFares(q)] as const),
    );
    phase1ByOrigin = new Map(results);
  } catch (err) {
    return NextResponse.json(
      { error: 'Flugpreissuche fehlgeschlagen', detail: (err as Error).message },
      { status: 502 },
    );
  }

  // Country-code enrichment from the active-airports list (best-effort).
  let airports: Airport[] = [];
  try {
    airports = await getActiveAirports();
  } catch {
    /* non-fatal */
  }
  const airportsByIata = new Map(airports.map((a) => [a.iata, a]));

  // Find candidate destinations: served by at least one origin in BOTH regions.
  const destsA = new Set<IataCode>();
  for (const a of regionA) {
    for (const f of phase1ByOrigin.get(a.iata) ?? []) destsA.add(f.destination);
  }
  const destsB = new Set<IataCode>();
  for (const a of regionB) {
    for (const f of phase1ByOrigin.get(a.iata) ?? []) destsB.add(f.destination);
  }
  const commonDestinations = [...destsA].filter((d) => destsB.has(d));

  // Rank candidates by Phase-1 combined cheapest. Cap at PHASE2_TOP_N to bound
  // the calendar fetch cost. The chosen ones get fully analyzed in Phase 2;
  // weak candidates fall off the list.
  const candidateScore = new Map<IataCode, number>();
  for (const dest of commonDestinations) {
    let aMin = Infinity;
    let bMin = Infinity;
    for (const a of regionA) {
      for (const f of phase1ByOrigin.get(a.iata) ?? []) {
        if (f.destination === dest && f.priceEur < aMin) aMin = f.priceEur;
      }
    }
    for (const a of regionB) {
      for (const f of phase1ByOrigin.get(a.iata) ?? []) {
        if (f.destination === dest && f.priceEur < bMin) bMin = f.priceEur;
      }
    }
    candidateScore.set(dest, aMin + bMin);
  }
  const topCandidates = [...commonDestinations]
    .sort((x, y) => (candidateScore.get(x) ?? Infinity) - (candidateScore.get(y) ?? Infinity))
    .slice(0, PHASE2_TOP_N);

  // ── Phase 2: daily calendars + matching ───────────────────────────────────
  // For each surviving destination D, we need:
  //   - outbound calendar from each origin in regions A∪B
  //   - inbound calendar back to each origin
  // The outbound window is [dateFrom, dateTo]; the inbound window is shifted
  // by [durMin, durMax] days.
  const inboundFrom = shiftIsoDate(parsed.dateFrom, parsed.tripDurationDaysMin);
  const inboundTo = shiftIsoDate(parsed.dateTo, parsed.tripDurationDaysMax);
  const outMonths = monthsBetween(parsed.dateFrom, parsed.dateTo);
  const inMonths = monthsBetween(inboundFrom, inboundTo);
  const allOrigins = [...new Set([...regionA, ...regionB].map((a) => a.iata))];

  // Build calendar fetches as a flat task list so we can throttle politely.
  interface CalTask {
    leg: 'out' | 'in';
    origin: IataCode;
    destination: IataCode;
    month: string;
  }
  const calTasks: CalTask[] = [];
  for (const dest of topCandidates) {
    for (const origin of allOrigins) {
      for (const m of outMonths) calTasks.push({ leg: 'out', origin, destination: dest, month: m });
      for (const m of inMonths) calTasks.push({ leg: 'in', origin, destination: dest, month: m });
    }
  }

  // The wrapper's internal cache + throttle handles serialization. We can
  // fire all tasks in parallel; the wrapper queues them.
  const calResults = await Promise.all(
    calTasks.map(async (t) => {
      const fares = await getCheapestPerDay(
        t.leg === 'out'
          ? { origin: t.origin, destination: t.destination, monthOfDate: t.month }
          : { origin: t.destination, destination: t.origin, monthOfDate: t.month },
      ).catch(() => [] as DailyFare[]);
      return { task: t, fares };
    }),
  );

  // Index calendars by (destination, leg, origin, day) → DailyFare.
  // Outbound: outboundByDest[dest][origin][day]
  // Inbound:  inboundByDest[dest][origin][day]
  const outboundByDest = new Map<IataCode, Map<IataCode, Map<string, DailyFare>>>();
  const inboundByDest = new Map<IataCode, Map<IataCode, Map<string, DailyFare>>>();
  for (const { task, fares } of calResults) {
    const map = task.leg === 'out' ? outboundByDest : inboundByDest;
    let perDest = map.get(task.destination);
    if (!perDest) {
      perDest = new Map();
      map.set(task.destination, perDest);
    }
    let perOrigin = perDest.get(task.origin);
    if (!perOrigin) {
      perOrigin = new Map();
      perDest.set(task.origin, perOrigin);
    }
    for (const f of fares) {
      // Filter to user's actual date windows (the month query rounds out).
      const ok =
        task.leg === 'out'
          ? f.day >= parsed.dateFrom && f.day <= parsed.dateTo
          : f.day >= inboundFrom && f.day <= inboundTo;
      if (ok) perOrigin.set(f.day, f);
    }
  }

  // Per destination: build matched IntersectionRow.
  const intersection: IntersectionRow[] = [];
  for (const dest of topCandidates) {
    const outboundByOrigin = outboundByDest.get(dest) ?? new Map();
    const inboundByOrigin = inboundByDest.get(dest) ?? new Map();
    if (outboundByOrigin.size === 0 || inboundByOrigin.size === 0) continue;

    // Country code + city name from the airports list.
    const destAirport = airportsByIata.get(dest);
    const destCity = destAirport?.cityName ?? dest;
    const destCountry = destAirport?.countryCode ?? 'XX';

    const row = findBestSharedTrip({
      destination: dest,
      destinationCityName: destCity,
      destinationCountryCode: destCountry,
      regionAirportsA: regionA,
      regionAirportsB: regionB,
      outboundByOrigin,
      inboundByOrigin,
      outboundDateFrom: parsed.dateFrom,
      outboundDateTo: parsed.dateTo,
      durationDaysMin: parsed.tripDurationDaysMin,
      durationDaysMax: parsed.tripDurationDaysMax,
      maxPricePerPersonEur: parsed.maxPricePerPersonEur,
      mode: parsed.dateMatchMode as DateMatchMode,
    });
    if (row) intersection.push(row);
  }

  // ── Phase 3: weather + rank ───────────────────────────────────────────────
  const weatherQueries = intersection
    .map((row) => {
      const dest = airportsByIata.get(row.destination);
      if (!dest) return null;
      const date = midpointDate(row.fromA.bestFare);
      return { key: row.destination, lat: dest.lat, lon: dest.lon, date };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  const weatherMap = await getWeatherBatch(weatherQueries);

  const ranked = rankResults(intersection, weatherMap, {
    weatherWeight: parsed.weatherWeight,
  });

  return NextResponse.json({
    counts: {
      regionAFares: 0,
      regionBFares: 0,
      regionADestinations: destsA.size,
      regionBDestinations: destsB.size,
      commonDestinations: intersection.length,
    },
    results: ranked.slice(0, 20),
  });
}
