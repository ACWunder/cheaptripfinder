/**
 * Integration test: the wrapper reads fixtures, the algorithm runs over them,
 * and we check the realistic Vienna+Berlin scenario produces sensible output.
 * This is the closest we get to "did I wire it up right" without actually
 * spinning up Next.js.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { intersectDestinations, rankResults } from '@/lib/algorithm';
import { _resetCacheForTests, getRoundTripFares } from '@/lib/ryanair/client';
import type { RegionAirport } from '@/types';

const VIENNA: RegionAirport[] = [
  { iata: 'VIE', name: 'Vienna', groundMinutesFromCenter: 25 },
  { iata: 'BTS', name: 'Bratislava', groundMinutesFromCenter: 75 },
];
const BERLIN: RegionAirport[] = [
  { iata: 'BER', name: 'Berlin Brandenburg', groundMinutesFromCenter: 45 },
  { iata: 'LEJ', name: 'Leipzig/Halle', groundMinutesFromCenter: 90 },
];

describe('end-to-end with fixtures', () => {
  beforeEach(() => {
    _resetCacheForTests();
    process.env.RYANAIR_MODE = 'fixtures';
  });

  it('Vienna + Berlin yields the expected intersection from fixtures', async () => {
    const q = {
      outboundDateFrom: '2025-06-13',
      outboundDateTo: '2025-06-15',
      durationDaysMin: 3,
      durationDaysMax: 5,
      maxPriceEur: 200,
    };
    const allFares = (
      await Promise.all(
        [...VIENNA, ...BERLIN].map((a) => getRoundTripFares({ ...q, origin: a.iata })),
      )
    ).flat();

    const aFares = allFares.filter((f) => VIENNA.some((x) => x.iata === f.origin));
    const bFares = allFares.filter((f) => BERLIN.some((x) => x.iata === f.origin));

    const intersect = intersectDestinations(aFares, bFares, VIENNA, BERLIN);

    const dests = intersect.map((r) => r.destination).sort();
    // From the fixture design:
    //   Vienna can reach: AGP, PMI, ALC, DUB, BGY, CTA (VIE) + AGP, PMI, NAP, DUB, BGY (BTS)
    //   Berlin can reach: AGP, PMI, FAO, NAP, DUB, BGY, STN (BER) + AGP, PMI, FAO, BGY (LEJ)
    //   Intersection:    AGP, PMI, DUB, BGY, NAP
    //   (CTA, ALC: VIE-only. STN: BER-only. FAO: Berlin-only.)
    expect(dests).toEqual(['AGP', 'BGY', 'DUB', 'NAP', 'PMI']);
  });

  it('PMI is cheaper from BTS than VIE (the multi-airport win)', async () => {
    process.env.RYANAIR_MODE = 'fixtures';
    const q = {
      outboundDateFrom: '2025-06-13',
      outboundDateTo: '2025-06-15',
      durationDaysMin: 3,
      durationDaysMax: 5,
      maxPriceEur: 200,
    };
    const vieFares = await getRoundTripFares({ ...q, origin: 'VIE' });
    const btsFares = await getRoundTripFares({ ...q, origin: 'BTS' });
    // PMI exists in both VIE and BTS fixtures with the same date pair, so the
    // intersection-against-itself will pick BTS as the cheaper origin.
    const intersect = intersectDestinations(
      [...vieFares, ...btsFares],
      [...vieFares, ...btsFares],
      VIENNA,
      VIENNA,
    );
    const pmi = intersect.find((r) => r.destination === 'PMI');
    expect(pmi?.fromA.bestFare.origin).toBe('BTS');
    expect(pmi?.fromA.bestFare.priceEur).toBeLessThan(50);
  });

  it('full pipeline produces a ranked top-N result', async () => {
    const q = {
      outboundDateFrom: '2025-06-13',
      outboundDateTo: '2025-06-15',
      durationDaysMin: 3,
      durationDaysMax: 5,
      maxPriceEur: 200,
    };
    const aFares = (await Promise.all(VIENNA.map((a) => getRoundTripFares({ ...q, origin: a.iata })))).flat();
    const bFares = (await Promise.all(BERLIN.map((a) => getRoundTripFares({ ...q, origin: a.iata })))).flat();

    const intersect = intersectDestinations(aFares, bFares, VIENNA, BERLIN);

    const ranked = rankResults(intersect, new Map(), { weatherWeight: 0 });
    expect(ranked.length).toBeGreaterThan(0);
    // Sorted descending by score (= ascending by adjusted price when no weather).
    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1]!;
      const curr = ranked[i]!;
      expect(prev.adjustedPriceEur).toBeLessThanOrEqual(curr.adjustedPriceEur);
    }
  });
});
