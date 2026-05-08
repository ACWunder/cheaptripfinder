/**
 * POST /api/search
 *
 * Glue between the wrappers and the pure algorithm. Validates input,
 * fetches fares for every airport in both regions, builds the destination
 * intersection, fetches weather for the survivors, ranks, returns top 20.
 *
 * Latency note: with 4 airports total and the polite throttle in the
 * Ryanair wrapper (~300ms spacing), this is ~1-2s in fixtures mode and
 * 3-15s against the live API. The spec calls out 10-30s with multi-airport;
 * matches expectations.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  cheapestPerDestination,
  intersectDestinations,
  rankResults,
} from '@/lib/algorithm';
import { listRegions } from '@/lib/regions';
import { getActiveAirports, getRoundTripFares } from '@/lib/ryanair/client';
import { getWeatherBatch } from '@/lib/weather';
import type { Airport, FareOption, RegionAirport } from '@/types';

// Vercel hobby tier defaults serverless funcs to 10s. Live Ryanair searches
// can take 3–15s; bump to 30s so we don't get cut off mid-fetch.
export const maxDuration = 30;

const SearchInputSchema = z.object({
  regionAAirports: z.array(z.string().length(3)).min(1).max(8),
  regionBAirports: z.array(z.string().length(3)).min(1).max(8),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tripDurationDaysMin: z.number().int().min(1).max(30),
  tripDurationDaysMax: z.number().int().min(1).max(30),
  maxPricePerPersonEur: z.number().int().min(20).max(2000),
  weatherWeight: z.number().min(0).max(2),
});

/** Look up ground time per airport via the union of all known regions. */
function buildRegionAirportSet(iatas: string[]): RegionAirport[] {
  const allAirports = listRegions().flatMap((r) => r.airports);
  const byIata = new Map(allAirports.map((a) => [a.iata, a]));
  return iatas.map((iata) => {
    const found = byIata.get(iata.toUpperCase());
    if (found) return found;
    // User-supplied custom airport not in any preset region — assume 60min,
    // a reasonable default. The UI lets the user override.
    return { iata: iata.toUpperCase(), name: iata.toUpperCase(), groundMinutesFromCenter: 60 };
  });
}

/** Pick the median outbound date from a fare option for weather lookup. */
function midpointDate(fare: FareOption): string {
  const out = new Date(`${fare.outboundDate}T00:00:00Z`);
  const back = new Date(`${fare.inboundDate}T00:00:00Z`);
  const mid = new Date((out.getTime() + back.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

/** Best-effort: enrich fare with country code from the airports list. */
function enrichFaresWithCountry(fares: FareOption[], airports: Airport[]): FareOption[] {
  const byIata = new Map(airports.map((a) => [a.iata, a]));
  return fares.map((f) => {
    const a = byIata.get(f.destination);
    if (!a) return f;
    return { ...f, destinationCountryCode: a.countryCode };
  });
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

  // 1. Fetch fares from each origin (in parallel — wrapper internally throttles).
  const fareQueries = [...regionA, ...regionB].map((a) => ({
    origin: a.iata,
    outboundDateFrom: parsed.dateFrom,
    outboundDateTo: parsed.dateTo,
    durationDaysMin: parsed.tripDurationDaysMin,
    durationDaysMax: parsed.tripDurationDaysMax,
    maxPriceEur: parsed.maxPricePerPersonEur,
  }));

  let allFaresByOrigin: Map<string, FareOption[]>;
  try {
    const results = await Promise.all(
      fareQueries.map(async (q) => [q.origin, await getRoundTripFares(q)] as const),
    );
    allFaresByOrigin = new Map(results);
  } catch (err) {
    return NextResponse.json(
      { error: 'Flugpreissuche fehlgeschlagen', detail: (err as Error).message },
      { status: 502 },
    );
  }

  // 2. Enrich with country codes from the airports list.
  let airports: Airport[] = [];
  try {
    airports = await getActiveAirports();
  } catch {
    // Non-fatal: country code stays as the placeholder from the wrapper.
  }

  const regionAFares = regionA
    .flatMap((a) => allFaresByOrigin.get(a.iata) ?? [])
    .map((f) => f);
  const regionBFares = regionB
    .flatMap((a) => allFaresByOrigin.get(a.iata) ?? [])
    .map((f) => f);

  const enrichedA = enrichFaresWithCountry(regionAFares, airports);
  const enrichedB = enrichFaresWithCountry(regionBFares, airports);

  // 3. Per-region cheapest, then intersect.
  const bestA = cheapestPerDestination(enrichedA, regionA);
  const bestB = cheapestPerDestination(enrichedB, regionB);
  const intersection = intersectDestinations(bestA, bestB);

  // 4. Weather lookup: one query per surviving destination.
  const airportsByIata = new Map(airports.map((a) => [a.iata, a]));
  const weatherQueries = intersection
    .map((row) => {
      const dest = airportsByIata.get(row.destination);
      if (!dest) return null;
      // Use region-A's outbound midpoint as the representative date.
      const date = midpointDate(row.fromA.bestFare);
      return { key: row.destination, lat: dest.lat, lon: dest.lon, date };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  const weatherMap = await getWeatherBatch(weatherQueries);

  // 5. Rank and return top 20.
  const ranked = rankResults(intersection, weatherMap, {
    weatherWeight: parsed.weatherWeight,
  });

  return NextResponse.json({
    counts: {
      regionAFares: regionAFares.length,
      regionBFares: regionBFares.length,
      regionADestinations: bestA.length,
      regionBDestinations: bestB.length,
      commonDestinations: intersection.length,
    },
    results: ranked.slice(0, 20),
  });
}
