/**
 * Pure algorithm functions for the trip search.
 *
 * No I/O, no side effects, no console logs. Each function takes data in,
 * returns data out. This makes them trivially testable and lets the caller
 * (an API route) decide how to fetch and assemble inputs.
 *
 * Algorithm (from spec):
 *   1. For each origin in a region, you have a list of FareOption.
 *   2. cheapestPerDestination collapses that into one entry per destination,
 *      keeping the cheapest origin/option per dest.
 *   3. intersectDestinations finds destinations reachable from BOTH regions.
 *   4. scoreWeather assigns transparent points to a weather summary.
 *   5. rankResults applies ground-time penalty, weather weighting, sorting.
 */

import {
  buildBookingUrl,
  buildOneWayBookingUrl,
  type DailyFare,
} from '@/lib/ryanair/client';
import type {
  FareOption,
  IataCode,
  RankedDestination,
  RegionAirport,
  RegionBestFare,
  WeatherScoreBreakdown,
  WeatherSummary,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1+2: date-matched intersection
//
// A "shared trip" only makes sense if both friends are at the destination
// AT THE SAME TIME. The matching is built on top of a per-route daily fare
// calendar (Ryanair's /cheapestPerDay), not the heuristic single-cheapest
// roundTripFares — otherwise we'd be hoping that two independently-cheapest
// trips happen to share dates, which they almost never do.
//
// `findBestSharedTrip` is the per-destination workhorse: it gets the daily
// outbound + inbound calendars for every origin in both regions, builds all
// valid round-trips per region, then matches across regions on the SAME
// (outDate, inDate) pair (or ±1 day if mode='flex1'). Per destination, the
// cheapest matching pair wins.
//
// `intersectDestinations` is retained for back-compat with tests + the older
// roundTripFares path; it does the same thing but without per-day granularity.
// ─────────────────────────────────────────────────────────────────────────────

export interface IntersectionRow {
  destination: IataCode;
  fromA: RegionBestFare;
  fromB: RegionBestFare;
}

export type DateMatchMode = 'strict' | 'flex1';

/** A round-trip built from two one-way calendar entries, for one origin in one region. */
interface RoundTripCandidate {
  outDate: string;
  inDate: string;
  origin: IataCode;
  outFare: DailyFare;
  inFare: DailyFare;
  totalPriceEur: number;
  groundMinutesFromCenter: number;
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(outDay: string, inDay: string): number {
  const out = Date.parse(`${outDay}T00:00:00Z`);
  const back = Date.parse(`${inDay}T00:00:00Z`);
  return Math.round((back - out) / 86400000);
}

/**
 * For one region, enumerate every (outDate, inDate) day-pair where:
 *   - there's an outbound flight on outDate and an inbound flight on inDate
 *     from the SAME origin (a single person can't fly out from VIE and back into BTS)
 *   - the duration is within the user's [durMin, durMax] range
 *   - outDate is within the search window
 *   - the round-trip price ≤ maxPriceEur
 * Returns one candidate per (outDate, inDate), keeping the cheapest origin.
 * Ties broken by ground time from city center.
 */
function buildRoundTripsPerDayPair(
  outboundByOrigin: Map<IataCode, Map<string, DailyFare>>,
  inboundByOrigin: Map<IataCode, Map<string, DailyFare>>,
  regionAirports: RegionAirport[],
  durMin: number,
  durMax: number,
  outFrom: string,
  outTo: string,
  maxPriceEur: number,
): Map<string, RoundTripCandidate> {
  const result = new Map<string, RoundTripCandidate>();

  for (const region of regionAirports) {
    const out = outboundByOrigin.get(region.iata);
    const back = inboundByOrigin.get(region.iata);
    if (!out || !back) continue;

    for (const [outDay, outFare] of out) {
      if (outDay < outFrom || outDay > outTo) continue;
      for (const [inDay, inFare] of back) {
        const nights = daysBetween(outDay, inDay);
        if (nights < durMin || nights > durMax) continue;
        const total = outFare.priceEur + inFare.priceEur;
        if (total > maxPriceEur) continue;

        const key = `${outDay}|${inDay}`;
        const existing = result.get(key);
        if (
          !existing ||
          total < existing.totalPriceEur ||
          (total === existing.totalPriceEur &&
            region.groundMinutesFromCenter < existing.groundMinutesFromCenter)
        ) {
          result.set(key, {
            outDate: outDay,
            inDate: inDay,
            origin: region.iata,
            outFare,
            inFare,
            totalPriceEur: total,
            groundMinutesFromCenter: region.groundMinutesFromCenter,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Match A's per-day-pair trips with B's. In `strict` mode, both outbound
 * dates and both inbound dates must match exactly. In `flex1` mode, each
 * may differ by up to one day (so the two friends' itineraries are at most
 * a day off, but the trip overlap is still real).
 *
 * Returns the cheapest matched pair, or null if no overlap exists.
 */
function bestMatchAcrossRegions(
  aTrips: Map<string, RoundTripCandidate>,
  bTrips: Map<string, RoundTripCandidate>,
  mode: DateMatchMode,
): { a: RoundTripCandidate; b: RoundTripCandidate; combined: number } | null {
  const offsets = mode === 'strict' ? [0] : [-1, 0, 1];
  let best: { a: RoundTripCandidate; b: RoundTripCandidate; combined: number } | null = null;

  for (const a of aTrips.values()) {
    for (const dOut of offsets) {
      for (const dIn of offsets) {
        const key = `${shiftIso(a.outDate, dOut)}|${shiftIso(a.inDate, dIn)}`;
        const b = bTrips.get(key);
        if (!b) continue;
        const combined = a.totalPriceEur + b.totalPriceEur;
        if (!best || combined < best.combined) best = { a, b, combined };
      }
    }
  }
  return best;
}

function dailyToFareOption(
  origin: IataCode,
  destination: IataCode,
  destinationCityName: string,
  destinationCountryCode: string,
  outFare: DailyFare,
  inFare: DailyFare,
): FareOption {
  return {
    origin,
    destination,
    destinationCityName,
    destinationCountryCode,
    outboundPriceEur: outFare.priceEur,
    inboundPriceEur: inFare.priceEur,
    priceEur: outFare.priceEur + inFare.priceEur,
    outboundDate: outFare.day,
    inboundDate: inFare.day,
    outboundDepartureAt: outFare.departureAt,
    inboundDepartureAt: inFare.departureAt,
    outboundBookingUrl: buildOneWayBookingUrl(origin, destination, outFare.day),
    inboundBookingUrl: buildOneWayBookingUrl(destination, origin, inFare.day),
    bookingUrl: buildBookingUrl(origin, destination, outFare.day, inFare.day),
  };
}

export interface SharedTripQuery {
  destination: IataCode;
  destinationCityName: string;
  destinationCountryCode: string;
  regionAirportsA: RegionAirport[];
  regionAirportsB: RegionAirport[];
  /** outbound[origin][day] = DailyFare. Origin is in either region. */
  outboundByOrigin: Map<IataCode, Map<string, DailyFare>>;
  /** inbound[origin][day] = DailyFare (returns to that origin). */
  inboundByOrigin: Map<IataCode, Map<string, DailyFare>>;
  outboundDateFrom: string;
  outboundDateTo: string;
  durationDaysMin: number;
  durationDaysMax: number;
  maxPricePerPersonEur: number;
  mode: DateMatchMode;
}

/**
 * Build the best shared round-trip for a single destination, given full
 * daily-calendar data for both regions. Returns null if no compatible
 * (outDate, inDate) pair exists across regions.
 */
export function findBestSharedTrip(q: SharedTripQuery): IntersectionRow | null {
  const aTrips = buildRoundTripsPerDayPair(
    q.outboundByOrigin,
    q.inboundByOrigin,
    q.regionAirportsA,
    q.durationDaysMin,
    q.durationDaysMax,
    q.outboundDateFrom,
    q.outboundDateTo,
    q.maxPricePerPersonEur,
  );
  const bTrips = buildRoundTripsPerDayPair(
    q.outboundByOrigin,
    q.inboundByOrigin,
    q.regionAirportsB,
    q.durationDaysMin,
    q.durationDaysMax,
    q.outboundDateFrom,
    q.outboundDateTo,
    q.maxPricePerPersonEur,
  );

  const matched = bestMatchAcrossRegions(aTrips, bTrips, q.mode);
  if (!matched) return null;

  const fromA: RegionBestFare = {
    destination: q.destination,
    destinationCityName: q.destinationCityName,
    destinationCountryCode: q.destinationCountryCode,
    bestFare: dailyToFareOption(
      matched.a.origin,
      q.destination,
      q.destinationCityName,
      q.destinationCountryCode,
      matched.a.outFare,
      matched.a.inFare,
    ),
    groundMinutesFromCenter: matched.a.groundMinutesFromCenter,
  };
  const fromB: RegionBestFare = {
    destination: q.destination,
    destinationCityName: q.destinationCityName,
    destinationCountryCode: q.destinationCountryCode,
    bestFare: dailyToFareOption(
      matched.b.origin,
      q.destination,
      q.destinationCityName,
      q.destinationCountryCode,
      matched.b.outFare,
      matched.b.inFare,
    ),
    groundMinutesFromCenter: matched.b.groundMinutesFromCenter,
  };

  return { destination: q.destination, fromA, fromB };
}

interface RegionBestFareCandidate {
  fare: FareOption;
  ground: number;
}

function tripKey(f: FareOption): string {
  return `${f.destination}|${f.outboundDate}|${f.inboundDate}`;
}

/**
 * For one region's flat fare list, group by (destination, outboundDate,
 * inboundDate) and keep the cheapest origin per group. Ties broken by ground
 * time from center.
 */
function cheapestPerTrip(
  fares: FareOption[],
  regionAirports: RegionAirport[],
): Map<string, RegionBestFareCandidate> {
  const groundByIata = new Map(regionAirports.map((a) => [a.iata, a.groundMinutesFromCenter]));
  const best = new Map<string, RegionBestFareCandidate>();
  for (const fare of fares) {
    const ground = groundByIata.get(fare.origin);
    if (ground === undefined) continue; // fare from an airport not in this region
    const key = tripKey(fare);
    const existing = best.get(key);
    if (
      !existing ||
      fare.priceEur < existing.fare.priceEur ||
      (fare.priceEur === existing.fare.priceEur && ground < existing.ground)
    ) {
      best.set(key, { fare, ground });
    }
  }
  return best;
}

/**
 * Match destinations across both regions on the SAME outbound + inbound dates.
 * Returns one row per shared destination, using the date pair with the lowest
 * combined price.
 */
export function intersectDestinations(
  faresA: FareOption[],
  faresB: FareOption[],
  regionAirportsA: RegionAirport[],
  regionAirportsB: RegionAirport[],
): IntersectionRow[] {
  const aByTrip = cheapestPerTrip(faresA, regionAirportsA);
  const bByTrip = cheapestPerTrip(faresB, regionAirportsB);

  const cheapestPerDest = new Map<IataCode, IntersectionRow>();
  for (const [key, a] of aByTrip) {
    const b = bByTrip.get(key);
    if (!b) continue;

    const dest = a.fare.destination;
    const candidate: IntersectionRow = {
      destination: dest,
      fromA: {
        destination: dest,
        destinationCityName: a.fare.destinationCityName,
        destinationCountryCode: a.fare.destinationCountryCode,
        bestFare: a.fare,
        groundMinutesFromCenter: a.ground,
      },
      fromB: {
        destination: dest,
        destinationCityName: b.fare.destinationCityName,
        destinationCountryCode: b.fare.destinationCountryCode,
        bestFare: b.fare,
        groundMinutesFromCenter: b.ground,
      },
    };
    const existing = cheapestPerDest.get(dest);
    if (!existing) {
      cheapestPerDest.set(dest, candidate);
    } else {
      const candidateTotal = a.fare.priceEur + b.fare.priceEur;
      const existingTotal = existing.fromA.bestFare.priceEur + existing.fromB.bestFare.priceEur;
      if (candidateTotal < existingTotal) cheapestPerDest.set(dest, candidate);
    }
  }
  return Array.from(cheapestPerDest.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: weather score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transparent weather scoring per spec.
 * Uses the *daily max* temperature for the temp band check (most relevant for
 * a trip — what's the warm part of the day going to feel like).
 */
export function scoreWeather(w: WeatherSummary): WeatherScoreBreakdown {
  const reasons: string[] = [];

  let tempPoints = 0;
  const high = w.tempMaxC;
  if (high >= 18 && high <= 28) {
    tempPoints = 10;
    reasons.push(`Pleasant high of ${high.toFixed(0)}°C (+10)`);
  } else if ((high >= 12 && high < 18) || (high > 28 && high <= 32)) {
    tempPoints = 5;
    reasons.push(`Acceptable high of ${high.toFixed(0)}°C (+5)`);
  } else {
    reasons.push(`Suboptimal high of ${high.toFixed(0)}°C (+0)`);
  }

  let precipPoints = 0;
  const p = w.precipitationProbabilityPct;
  if (p < 20) {
    precipPoints = 5;
    reasons.push(`Low rain chance ${p.toFixed(0)}% (+5)`);
  } else if (p < 40) {
    precipPoints = 2;
    reasons.push(`Some rain risk ${p.toFixed(0)}% (+2)`);
  } else {
    reasons.push(`High rain chance ${p.toFixed(0)}% (+0)`);
  }

  let sunshinePoints = 0;
  // "high sunshine hours" — define as ≥8h, which is good for late spring / summer.
  if (w.sunshineHours >= 8) {
    sunshinePoints = 3;
    reasons.push(`${w.sunshineHours.toFixed(1)}h sun (+3)`);
  } else {
    reasons.push(`${w.sunshineHours.toFixed(1)}h sun (+0)`);
  }

  return {
    tempPoints,
    precipPoints,
    sunshinePoints,
    total: tempPoints + precipPoints + sunshinePoints,
    reasons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: rank results
// ─────────────────────────────────────────────────────────────────────────────

export interface RankOptions {
  /** From SearchInput.weatherWeight. */
  weatherWeight: number;
  /** Per 30min beyond this, apply ground-time penalty. Default 30. */
  groundFreeMinutes?: number;
  /** Penalty in EUR-equivalent per 30min over the free threshold. Default 10. */
  groundPenaltyEurPer30Min?: number;
}

export function rankResults(
  rows: IntersectionRow[],
  weatherByDestination: Map<IataCode, WeatherSummary | null>,
  opts: RankOptions,
): RankedDestination[] {
  const groundFree = opts.groundFreeMinutes ?? 30;
  const penaltyPer30 = opts.groundPenaltyEurPer30Min ?? 10;

  const ranked = rows.map((row): RankedDestination => {
    const combined = row.fromA.bestFare.priceEur + row.fromB.bestFare.priceEur;

    // Ground-time penalty: each region contributes independently.
    const overA = Math.max(0, row.fromA.groundMinutesFromCenter - groundFree);
    const overB = Math.max(0, row.fromB.groundMinutesFromCenter - groundFree);
    const penalty = ((overA + overB) / 30) * penaltyPer30;
    const adjusted = combined + penalty;

    const weather = weatherByDestination.get(row.destination) ?? null;
    const wScore = weather ? scoreWeather(weather) : null;

    // Score: lower price = better, higher weather = better.
    // We don't normalize price; weatherWeight is in "weather points per EUR".
    // Sensible defaults: weatherWeight=0 → ignore weather; 1 → 1 weather pt = €1;
    // 2 → 1 weather pt = €2 (weather dominates).
    const score = -adjusted + (wScore?.total ?? 0) * opts.weatherWeight;

    return {
      destination: row.destination,
      destinationCityName: row.fromA.destinationCityName,
      destinationCountryCode: row.fromA.destinationCountryCode,
      fromRegionA: row.fromA,
      fromRegionB: row.fromB,
      combinedPriceEur: combined,
      adjustedPriceEur: adjusted,
      weather,
      weatherScore: wScore,
      score,
    };
  });

  // Stable sort: score desc, then combined price asc as tie-breaker.
  ranked.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    return x.combinedPriceEur - y.combinedPriceEur;
  });

  return ranked;
}
