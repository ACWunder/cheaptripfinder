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
// Step 1: per-region cheapest-per-destination
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a flat list of FareOption from many origins in one region,
 * pick the cheapest fare per destination. If two fares tie on price,
 * the one with shorter ground-time-from-center wins.
 */
export function cheapestPerDestination(
  fares: FareOption[],
  regionAirports: RegionAirport[],
): RegionBestFare[] {
  const groundByIata = new Map(regionAirports.map((a) => [a.iata, a.groundMinutesFromCenter]));
  const best = new Map<IataCode, RegionBestFare>();

  for (const fare of fares) {
    const ground = groundByIata.get(fare.origin);
    if (ground === undefined) {
      // Fare from an airport not in this region's set — ignore.
      continue;
    }
    const existing = best.get(fare.destination);
    const candidate: RegionBestFare = {
      destination: fare.destination,
      destinationCityName: fare.destinationCityName,
      destinationCountryCode: fare.destinationCountryCode,
      bestFare: fare,
      groundMinutesFromCenter: ground,
    };
    if (
      !existing ||
      fare.priceEur < existing.bestFare.priceEur ||
      (fare.priceEur === existing.bestFare.priceEur &&
        ground < existing.groundMinutesFromCenter)
    ) {
      best.set(fare.destination, candidate);
    }
  }
  return Array.from(best.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: intersect destinations between two regions
// ─────────────────────────────────────────────────────────────────────────────

export interface IntersectionRow {
  destination: IataCode;
  fromA: RegionBestFare;
  fromB: RegionBestFare;
}

export function intersectDestinations(
  regionA: RegionBestFare[],
  regionB: RegionBestFare[],
): IntersectionRow[] {
  const aMap = new Map(regionA.map((r) => [r.destination, r]));
  const out: IntersectionRow[] = [];
  for (const b of regionB) {
    const a = aMap.get(b.destination);
    if (a) out.push({ destination: b.destination, fromA: a, fromB: b });
  }
  return out;
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
