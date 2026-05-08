import { describe, expect, it } from 'vitest';

import {
  cheapestPerDestination,
  intersectDestinations,
  rankResults,
  scoreWeather,
} from '@/lib/algorithm';
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

function fare(origin: string, destination: string, priceEur: number, destCity = destination): FareOption {
  return {
    origin,
    destination,
    destinationCityName: destCity,
    destinationCountryCode: 'XX',
    outboundPriceEur: Number((priceEur * 0.5).toFixed(2)),
    inboundPriceEur: Number((priceEur * 0.5).toFixed(2)),
    priceEur,
    outboundDate: '2025-06-13',
    inboundDate: '2025-06-16',
    outboundDepartureAt: '2025-06-13T07:00:00',
    inboundDepartureAt: '2025-06-16T19:30:00',
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
// cheapestPerDestination
// ─────────────────────────────────────────────────────────────────────────────

describe('cheapestPerDestination', () => {
  it('picks the cheapest origin per destination', () => {
    const fares = [
      fare('VIE', 'PMI', 89.5),
      fare('BTS', 'PMI', 32.99),
      fare('VIE', 'AGP', 72.99),
      fare('BTS', 'AGP', 65),
    ];
    const result = cheapestPerDestination(fares, VIENNA_AIRPORTS);
    expect(result).toHaveLength(2);
    const pmi = result.find((r) => r.destination === 'PMI');
    expect(pmi?.bestFare.origin).toBe('BTS');
    expect(pmi?.bestFare.priceEur).toBe(32.99);
    const agp = result.find((r) => r.destination === 'AGP');
    expect(agp?.bestFare.origin).toBe('BTS');
    expect(agp?.bestFare.priceEur).toBe(65);
  });

  it('on price tie, prefers the airport with shorter ground time', () => {
    const fares = [fare('VIE', 'AGP', 50), fare('BTS', 'AGP', 50)];
    const result = cheapestPerDestination(fares, VIENNA_AIRPORTS);
    expect(result[0]?.bestFare.origin).toBe('VIE');
    expect(result[0]?.groundMinutesFromCenter).toBe(25);
  });

  it('ignores fares from airports not in the region set', () => {
    // Pretend a stray DUB→AGP fare leaked into the region-A list.
    const fares = [fare('VIE', 'AGP', 50), fare('DUB', 'AGP', 10)];
    const result = cheapestPerDestination(fares, VIENNA_AIRPORTS);
    expect(result).toHaveLength(1);
    expect(result[0]?.bestFare.origin).toBe('VIE');
  });

  it('returns empty for empty fares', () => {
    expect(cheapestPerDestination([], VIENNA_AIRPORTS)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// intersectDestinations
// ─────────────────────────────────────────────────────────────────────────────

describe('intersectDestinations', () => {
  it('keeps only destinations present in both regions', () => {
    const a = cheapestPerDestination(
      [fare('VIE', 'AGP', 70), fare('BTS', 'NAP', 40), fare('VIE', 'CTA', 80)],
      VIENNA_AIRPORTS,
    );
    const b = cheapestPerDestination(
      [fare('BER', 'AGP', 58), fare('BER', 'NAP', 55), fare('BER', 'STN', 35)],
      BERLIN_AIRPORTS,
    );
    const intersection = intersectDestinations(a, b);
    const dests = intersection.map((r) => r.destination).sort();
    expect(dests).toEqual(['AGP', 'NAP']);
    // CTA is region-A only, STN is region-B only — both excluded.
  });

  it('returns empty when there is no overlap', () => {
    const a = cheapestPerDestination([fare('VIE', 'CTA', 70)], VIENNA_AIRPORTS);
    const b = cheapestPerDestination([fare('BER', 'STN', 35)], BERLIN_AIRPORTS);
    expect(intersectDestinations(a, b)).toEqual([]);
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
    const a = cheapestPerDestination(
      [
        fare('VIE', 'AGP', 60, 'Malaga'),
        fare('VIE', 'DUB', 50, 'Dublin'),
        fare('BTS', 'PMI', 80, 'Palma'),
      ],
      VIENNA_AIRPORTS,
    );
    const b = cheapestPerDestination(
      [
        fare('BER', 'AGP', 60, 'Malaga'),
        fare('BER', 'DUB', 40, 'Dublin'),
        fare('BER', 'PMI', 60, 'Palma'),
      ],
      BERLIN_AIRPORTS,
    );
    return intersectDestinations(a, b);
  }

  const weatherMap = new Map<string, WeatherSummary | null>([
    ['AGP', weather(26, 5, 11)], // ideal: 18 pts
    ['DUB', weather(10, 70, 3)], // grim: 0 pts (10°C high → no temp points; 70% rain → none; 3h sun → none)
    ['PMI', weather(28, 10, 11)], // ideal: 18 pts
  ]);

  it('with weatherWeight=0 ranks purely by adjusted price', () => {
    const rows = makeRows();
    const ranked = rankResults(rows, weatherMap, { weatherWeight: 0 });
    // DUB cheapest (50+40=90), AGP next (60+60=120), PMI most (80+60=140).
    // No ground-time penalty applies for VIE/BER (both ≤30min over).
    // Actually BTS=75min for PMI's region-A leg — that adds penalty.
    expect(ranked.map((r) => r.destination)).toEqual(['DUB', 'AGP', 'PMI']);
  });

  it('with weatherWeight=2 the sunny destinations beat cheap-but-grim DUB', () => {
    const rows = makeRows();
    const ranked = rankResults(rows, weatherMap, { weatherWeight: 2 });
    // Adjusted price (incl. ground penalty: BER 45min = 15min over → €5):
    //   AGP combined=120, adj=125, weather=18 → score = -125 + 36 = -89
    //   DUB combined=90,  adj=95,  weather=0  → score = -95
    //   PMI combined=140, adj=160 (BTS 75min over=€15 + BER €5), weather=18 → -124
    // Order: AGP, DUB, PMI
    expect(ranked[0]?.destination).toBe('AGP');
    expect(ranked[ranked.length - 1]?.destination).toBe('PMI');
  });

  it('applies ground-time penalty for distant airports', () => {
    // Same-price destinations, but one uses BTS (75min from Vienna center).
    const a = cheapestPerDestination(
      [fare('VIE', 'AGP', 50), fare('BTS', 'PMI', 50)],
      VIENNA_AIRPORTS,
    );
    const b = cheapestPerDestination(
      [fare('BER', 'AGP', 50), fare('BER', 'PMI', 50)],
      BERLIN_AIRPORTS,
    );
    const ranked = rankResults(intersectDestinations(a, b), new Map(), { weatherWeight: 0 });
    // Both have combined price 100. AGP from VIE: VIE=25min (no penalty), BER=45min (15 over → 5€).
    // PMI from BTS: BTS=75min (45 over → 15€), BER=45min (15 over → 5€).
    // Adjusted: AGP=105, PMI=120. AGP wins.
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
