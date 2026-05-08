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
// AT THE SAME TIME — i.e. same outbound date AND same return date. We can't
// pick the cheapest fare per region independently and then merge by
// destination; that produces two unrelated trips that happen to share a city.
//
// The match key is therefore (destination, outboundDate, inboundDate). For
// each such triple that exists in both regions, the cheapest origin per side
// wins, and per destination we then pick the date pair with the lowest
// combined price.
// ─────────────────────────────────────────────────────────────────────────────

export interface IntersectionRow {
  destination: IataCode;
  fromA: RegionBestFare;
  fromB: RegionBestFare;
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
