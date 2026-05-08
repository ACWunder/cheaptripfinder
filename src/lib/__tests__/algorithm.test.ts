import { describe, expect, it } from 'vitest';

import { intersectDestinations, rankResults, scoreWeather } from '@/lib/algorithm';
import type { FareOption, RegionAirport, WeatherSummary } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Test data builders
// ─────────────────────────────────────────────────────────────────────────────

const VIENNA_AIRPORTS: RegionAirport[] = [
  { iata: 'VIE', name: 'Vienna', groundMinutesFromCenter: 25 },
  { iata: 'BTS', name: 'Bratislava', groundMinutesFromCenter: 75 },
];

const BERLIN_AIRPORTS: RegionAirport[] = [
  { iata: 'BER', name: 'Berlin Brandenburg', groundMinutesFromCenter: 45 },
  { iata: 'LEJ', name: 'Leipzig/Halle', groundMinutesFromCenter: 90 },
];

interface FareOpts {
  outboundDate?: string;
  inboundDate?: string;
}

function fare(
  origin: string,
  destination: string,
  priceEur: number,
  destCity = destination,
  opts: FareOpts = {},
): FareOption {
  const outboundDate = opts.outboundDate ?? '2025-06-13';
  const inboundDate = opts.inboundDate ?? '2025-06-16';
  return {
    origin,
    destination,
    destinationCityName: destCity,
    destinationCountryCode: 'XX',
    outboundPriceEur: Number((priceEur * 0.5).toFixed(2)),
    inboundPriceEur: Number((priceEur * 0.5).toFixed(2)),
    priceEur,
    outboundDate,
    inboundDate,
    outboundDepartureAt: `${outboundDate}T07:00:00`,
    inboundDepartureAt: `${inboundDate}T19:30:00`,
    outboundBookingUrl: `https://example.com/${origin}-${destination}-outbound`,
    inboundBookingUrl: `https://example.com/${destination}-${origin}-inbound`,
    bookingUrl: `https://example.com/${origin}-${destination}`,
  };
}

function weather(tempMax: number, precipPct: number, sun: number): WeatherSummary {
  return {
    date: '2025-06-14',
    tempMinC: tempMax - 8,
    tempMaxC: tempMax,
    precipitationProbabilityPct: precipPct,
    sunshineHours: sun,
    source: 'forecast',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// intersectDestinations — date-matched
// ─────────────────────────────────────────────────────────────────────────────

describe('intersectDestinations', () => {
  it('keeps only destinations present in both regions', () => {
    const a = [fare('VIE', 'AGP', 70), fare('BTS', 'NAP', 40), fare('VIE', 'CTA', 80)];
    const b = [fare('BER', 'AGP', 58), fare('BER', 'NAP', 55), fare('BER', 'STN', 35)];
    const intersection = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(intersection.map((r) => r.destination).sort()).toEqual(['AGP', 'NAP']);
    // CTA is region-A only, STN is region-B only — both excluded.
  });

  it('returns empty when there is no overlap', () => {
    const a = [fare('VIE', 'CTA', 70)];
    const b = [fare('BER', 'STN', 35)];
    expect(intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS)).toEqual([]);
  });

  it('picks the cheapest origin per region for the matched trip', () => {
    const a = [fare('VIE', 'PMI', 90), fare('BTS', 'PMI', 33)];
    const b = [fare('BER', 'PMI', 60), fare('LEJ', 'PMI', 50)];
    const out = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(out).toHaveLength(1);
    expect(out[0]?.fromA.bestFare.origin).toBe('BTS');
    expect(out[0]?.fromB.bestFare.origin).toBe('LEJ');
  });

  it('on price tie, prefers the airport with shorter ground time', () => {
    // VIE (25min) vs BTS (75min) at same price.
    const a = [fare('VIE', 'AGP', 50), fare('BTS', 'AGP', 50)];
    const b = [fare('BER', 'AGP', 50)];
    const out = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(out[0]?.fromA.bestFare.origin).toBe('VIE');
  });

  it('ignores fares from airports not in the region set', () => {
    const a = [fare('VIE', 'AGP', 50), fare('DUB', 'AGP', 10)]; // DUB leak
    const b = [fare('BER', 'AGP', 60)];
    const out = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(out[0]?.fromA.bestFare.origin).toBe('VIE');
  });

  // ── The bug fix: trips must share dates ──────────────────────────────────

  it('does NOT match a destination when the two friends would travel on different weeks', () => {
    const a = [fare('VIE', 'BCN', 50, 'Barcelona', { outboundDate: '2025-06-13', inboundDate: '2025-06-16' })];
    const b = [fare('BER', 'BCN', 60, 'Barcelona', { outboundDate: '2025-07-10', inboundDate: '2025-07-13' })];
    const out = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(out).toEqual([]);
  });

  it('matches when both regions have the same outbound + inbound dates', () => {
    const a = [fare('VIE', 'BCN', 50, 'Barcelona', { outboundDate: '2025-06-13', inboundDate: '2025-06-16' })];
    const b = [fare('BER', 'BCN', 60, 'Barcelona', { outboundDate: '2025-06-13', inboundDate: '2025-06-16' })];
    const out = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(out).toHaveLength(1);
    expect(out[0]?.destination).toBe('BCN');
  });

  it('per destination, picks the date pair with the lowest combined price', () => {
    // Same destination, two date options. Pair 1: 100€, Pair 2: 70€. Should keep pair 2.
    const a = [
      fare('VIE', 'BCN', 60, 'Barcelona', { outboundDate: '2025-06-13', inboundDate: '2025-06-16' }),
      fare('VIE', 'BCN', 30, 'Barcelona', { outboundDate: '2025-06-20', inboundDate: '2025-06-23' }),
    ];
    const b = [
      fare('BER', 'BCN', 40, 'Barcelona', { outboundDate: '2025-06-13', inboundDate: '2025-06-16' }),
      fare('BER', 'BCN', 40, 'Barcelona', { outboundDate: '2025-06-20', inboundDate: '2025-06-23' }),
    ];
    const out = intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
    expect(out).toHaveLength(1);
    const row = out[0]!;
    expect(row.fromA.bestFare.outboundDate).toBe('2025-06-20');
    expect(row.fromA.bestFare.priceEur + row.fromB.bestFare.priceEur).toBe(70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreWeather
// ─────────────────────────────────────────────────────────────────────────────

describe('scoreWeather', () => {
  it('awards full points for ideal weather (24°C, dry, sunny)', () => {
    const s = scoreWeather(weather(24, 10, 10));
    expect(s.tempPoints).toBe(10);
    expect(s.precipPoints).toBe(5);
    expect(s.sunshinePoints).toBe(3);
    expect(s.total).toBe(18);
  });

  it('awards mid points for borderline-warm/borderline-rainy weather', () => {
    const s = scoreWeather(weather(15, 30, 6));
    expect(s.tempPoints).toBe(5);
    expect(s.precipPoints).toBe(2);
    expect(s.sunshinePoints).toBe(0);
    expect(s.total).toBe(7);
  });

  it('awards zero on ugly weather (cold, wet, gloomy)', () => {
    const s = scoreWeather(weather(8, 80, 1));
    expect(s.tempPoints).toBe(0);
    expect(s.precipPoints).toBe(0);
    expect(s.sunshinePoints).toBe(0);
    expect(s.total).toBe(0);
  });

  it('penalizes very hot weather (35°C) vs ideal', () => {
    const veryHot = scoreWeather(weather(35, 10, 11));
    const ideal = scoreWeather(weather(24, 10, 11));
    expect(veryHot.total).toBeLessThan(ideal.total);
  });

  it('returns reasons strings useful for the UI', () => {
    const s = scoreWeather(weather(24, 10, 10));
    expect(s.reasons.length).toBeGreaterThanOrEqual(3);
    expect(s.reasons.some((r) => r.includes('°C'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankResults — the integration test of the algorithm
// ─────────────────────────────────────────────────────────────────────────────

describe('rankResults', () => {
  // Three destinations: cheap+sunny, cheap+rainy, expensive+sunny.
  // Different weatherWeight values should reorder them.
  function makeRows() {
    const a = [
      fare('VIE', 'AGP', 60, 'Malaga'),
      fare('VIE', 'DUB', 50, 'Dublin'),
      fare('BTS', 'PMI', 80, 'Palma'),
    ];
    const b = [
      fare('BER', 'AGP', 60, 'Malaga'),
      fare('BER', 'DUB', 40, 'Dublin'),
      fare('BER', 'PMI', 60, 'Palma'),
    ];
    return intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS);
  }

  const weatherMap = new Map<string, WeatherSummary | null>([
    ['AGP', weather(26, 5, 11)], // ideal: 18 pts
    ['DUB', weather(10, 70, 3)], // grim: 0 pts
    ['PMI', weather(28, 10, 11)], // ideal: 18 pts
  ]);

  it('with weatherWeight=0 ranks purely by adjusted price', () => {
    const rows = makeRows();
    const ranked = rankResults(rows, weatherMap, { weatherWeight: 0 });
    expect(ranked.map((r) => r.destination)).toEqual(['DUB', 'AGP', 'PMI']);
  });

  it('with weatherWeight=2 the sunny destinations beat cheap-but-grim DUB', () => {
    const rows = makeRows();
    const ranked = rankResults(rows, weatherMap, { weatherWeight: 2 });
    expect(ranked[0]?.destination).toBe('AGP');
    expect(ranked[ranked.length - 1]?.destination).toBe('PMI');
  });

  it('applies ground-time penalty for distant airports', () => {
    const a = [fare('VIE', 'AGP', 50), fare('BTS', 'PMI', 50)];
    const b = [fare('BER', 'AGP', 50), fare('BER', 'PMI', 50)];
    const ranked = rankResults(
      intersectDestinations(a, b, VIENNA_AIRPORTS, BERLIN_AIRPORTS),
      new Map(),
      { weatherWeight: 0 },
    );
    // AGP from VIE (25min, no penalty) + BER (45min → 15 over → €5) = adj 105.
    // PMI from BTS (75min → 45 over → €15) + BER (€5) = adj 120.
    expect(ranked.map((r) => r.destination)).toEqual(['AGP', 'PMI']);
    expect(ranked[0]?.adjustedPriceEur).toBeCloseTo(105, 5);
    expect(ranked[1]?.adjustedPriceEur).toBeCloseTo(120, 5);
  });

  it('handles missing weather (null) gracefully', () => {
    const rows = makeRows();
    const noWeather = new Map<string, WeatherSummary | null>([
      ['AGP', null],
      ['DUB', null],
      ['PMI', null],
    ]);
    const ranked = rankResults(rows, noWeather, { weatherWeight: 2 });
    expect(ranked).toHaveLength(3);
    for (const r of ranked) {
      expect(r.weather).toBeNull();
      expect(r.weatherScore).toBeNull();
    }
  });
});
