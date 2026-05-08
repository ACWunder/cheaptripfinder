/**
 * Ryanair API wrapper.
 *
 * SINGLE chokepoint for all Ryanair calls. All other code goes through this.
 *
 * Three modes (env: RYANAIR_MODE):
 *   - 'fixtures'   : never hit the network. Read JSON from src/lib/__fixtures__.
 *                    Default. Use for dev, tests, CI.
 *   - 'live'       : always hit the real API. Use to refresh fixtures or in prod.
 *   - 'live-fallback': try live, fall back to fixtures on any error.
 *
 * Operational:
 *   - In-memory cache, 1h TTL. Identical query within an hour = cache hit.
 *   - 300ms minimum spacing between live requests to the same host.
 *   - Realistic Chrome User-Agent.
 *   - One retry on 5xx / network error, with backoff.
 *   - All output validated through Zod schemas — bad shape = boundary error,
 *     not silent NaN downstream.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import {
  RyanairActiveAirportsSchema,
  RyanairRoundTripFaresResponseSchema,
  type RyanairAirport,
  type RyanairRoundTripFaresResponse,
} from './schemas';
import type { Airport, FareOption, IataCode } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'fixtures' | 'live' | 'live-fallback';

function getMode(): Mode {
  const m = process.env.RYANAIR_MODE;
  if (m === 'live' || m === 'live-fallback') return m;
  return 'fixtures';
}

const BASE_URL = 'https://services-api.ryanair.com';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const MIN_REQUEST_SPACING_MS = 300;
const FIXTURES_DIR = path.join(process.cwd(), 'src/lib/__fixtures__');

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache + throttle
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}
const cache = new Map<string, CacheEntry<unknown>>();
let lastRequestAt = 0;

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}
function cacheSet<T>(key: string, value: T): void {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function throttle(): Promise<void> {
  const since = Date.now() - lastRequestAt;
  if (since < MIN_REQUEST_SPACING_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_SPACING_MS - since));
  }
  lastRequestAt = Date.now();
}

// ─────────────────────────────────────────────────────────────────────────────
// Low-level fetch with retry
// ─────────────────────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<unknown> {
  await throttle();
  const doFetch = async (): Promise<unknown> => {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    });
    if (!res.ok) {
      throw new Error(`Ryanair HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return res.json();
  };
  try {
    return await doFetch();
  } catch (err) {
    // One retry, with backoff
    await new Promise((r) => setTimeout(r, 800));
    return doFetch().catch((err2) => {
      throw new Error(`Ryanair request failed twice: ${(err as Error).message} / ${(err2 as Error).message}`);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture loading
// ─────────────────────────────────────────────────────────────────────────────

async function loadFixture<T>(relPath: string, schema: z.ZodSchema<T>): Promise<T> {
  const full = path.join(FIXTURES_DIR, relPath);
  const raw = await fs.readFile(full, 'utf8');
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalization helpers — Ryanair shape → our domain shape
// ─────────────────────────────────────────────────────────────────────────────

function ryanairAirportToDomain(a: RyanairAirport): Airport {
  return {
    iata: a.code.toUpperCase(),
    name: a.name,
    cityName: a.city.name,
    countryCode: a.country.code.toUpperCase(),
    countryName: a.country.name,
    lat: a.coordinates.latitude,
    lon: a.coordinates.longitude,
  };
}

function buildBookingUrl(
  origin: IataCode,
  destination: IataCode,
  outboundDate: string,
  inboundDate: string,
): string {
  const params = new URLSearchParams({
    adults: '1',
    teens: '0',
    children: '0',
    infants: '0',
    dateOut: outboundDate,
    dateIn: inboundDate,
    isConnectedFlight: 'false',
    isReturn: 'true',
    discount: '0',
    promoCode: '',
    originIata: origin,
    destinationIata: destination,
  });
  return `https://www.ryanair.com/gb/en/trip/flights/select?${params.toString()}`;
}

function buildOneWayBookingUrl(
  origin: IataCode,
  destination: IataCode,
  departureDate: string,
): string {
  const params = new URLSearchParams({
    adults: '1',
    teens: '0',
    children: '0',
    infants: '0',
    dateOut: departureDate,
    isConnectedFlight: 'false',
    isReturn: 'false',
    discount: '0',
    promoCode: '',
    originIata: origin,
    destinationIata: destination,
  });
  return `https://www.ryanair.com/gb/en/trip/flights/select?${params.toString()}`;
}

function ryanairFaresToDomain(
  origin: IataCode,
  resp: RyanairRoundTripFaresResponse,
): FareOption[] {
  return resp.fares.map((f) => {
    const outboundDate = f.outbound.departureDate.slice(0, 10);
    const inboundDate = f.inbound.departureDate.slice(0, 10);
    const dest = f.outbound.arrivalAirport.iataCode.toUpperCase();
    const destCity = f.outbound.arrivalAirport.city?.name ?? f.outbound.arrivalAirport.name ?? dest;
    const destCountry = (f.outbound.arrivalAirport.countryName ?? '').slice(0, 2).toUpperCase() || 'XX';
    const outboundDepartureAt = f.outbound.departureDate;
    const inboundDepartureAt = f.inbound.departureDate;
    const outboundPriceEur = f.outbound.price.value;
    const inboundPriceEur = f.inbound.price.value;
    return {
      origin,
      destination: dest,
      destinationCityName: destCity,
      // We only get country *name* in fares; country *code* is best fetched
      // from the airports list. Caller should enrich.
      destinationCountryCode: destCountry,
      outboundPriceEur,
      inboundPriceEur,
      priceEur: f.summary.price.value,
      outboundDate,
      inboundDate,
      outboundDepartureAt,
      inboundDepartureAt,
      outboundBookingUrl: buildOneWayBookingUrl(origin, dest, outboundDate),
      inboundBookingUrl: buildOneWayBookingUrl(dest, origin, inboundDate),
      bookingUrl: buildBookingUrl(origin, dest, outboundDate, inboundDate),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface RoundTripFaresQuery {
  origin: IataCode;
  outboundDateFrom: string; // YYYY-MM-DD
  outboundDateTo: string;
  durationDaysMin: number;
  durationDaysMax: number;
  maxPriceEur: number;
}

export async function getActiveAirports(): Promise<Airport[]> {
  const cacheKey = 'airports:active';
  const cached = cacheGet<Airport[]>(cacheKey);
  if (cached) return cached;

  const mode = getMode();
  let raw: RyanairAirport[];

  if (mode === 'fixtures') {
    raw = await loadFixture('airports.json', RyanairActiveAirportsSchema);
  } else {
    try {
      const json = await fetchJson(`${BASE_URL}/views/locate/5/airports/en/active`);
      raw = RyanairActiveAirportsSchema.parse(json);
    } catch (err) {
      if (mode === 'live-fallback') {
        // eslint-disable-next-line no-console
        console.warn('[ryanair] live failed, using fixtures:', (err as Error).message);
        raw = await loadFixture('airports.json', RyanairActiveAirportsSchema);
      } else {
        throw err;
      }
    }
  }
  const domain = raw.map(ryanairAirportToDomain);
  cacheSet(cacheKey, domain);
  return domain;
}

export async function getRoundTripFares(q: RoundTripFaresQuery): Promise<FareOption[]> {
  const cacheKey = `fares:${q.origin}:${q.outboundDateFrom}:${q.outboundDateTo}:${q.durationDaysMin}:${q.durationDaysMax}:${q.maxPriceEur}`;
  const cached = cacheGet<FareOption[]>(cacheKey);
  if (cached) return cached;

  const mode = getMode();
  let resp: RyanairRoundTripFaresResponse;

  if (mode === 'fixtures') {
    // Fixtures are keyed by origin only — one canonical fixture per airport.
    resp = await loadFixture(
      `fares/${q.origin}.json`,
      RyanairRoundTripFaresResponseSchema,
    );
  } else {
    const url = new URL(`${BASE_URL}/farfnd/v4/roundTripFares`);
    url.searchParams.set('departureAirportIataCode', q.origin);
    url.searchParams.set('outboundDepartureDateFrom', q.outboundDateFrom);
    url.searchParams.set('outboundDepartureDateTo', q.outboundDateTo);
    // Inbound window = outbound window shifted by trip duration
    url.searchParams.set('inboundDepartureDateFrom', shiftIsoDate(q.outboundDateFrom, q.durationDaysMin));
    url.searchParams.set('inboundDepartureDateTo', shiftIsoDate(q.outboundDateTo, q.durationDaysMax));
    url.searchParams.set('durationFrom', String(q.durationDaysMin));
    url.searchParams.set('durationTo', String(q.durationDaysMax));
    url.searchParams.set('priceValueTo', String(q.maxPriceEur));
    url.searchParams.set('currency', 'EUR');
    url.searchParams.set('market', 'en-gb');

    try {
      const json = await fetchJson(url.toString());
      resp = RyanairRoundTripFaresResponseSchema.parse(json);
    } catch (err) {
      if (mode === 'live-fallback') {
        // eslint-disable-next-line no-console
        console.warn(`[ryanair] live fares failed for ${q.origin}, using fixtures:`, (err as Error).message);
        resp = await loadFixture(
          `fares/${q.origin}.json`,
          RyanairRoundTripFaresResponseSchema,
        );
      } else {
        throw err;
      }
    }
  }

  const fares = ryanairFaresToDomain(q.origin, resp);
  // Apply price filter client-side too — fixtures don't filter, and live can
  // sometimes return results slightly above the cap.
  const filtered = fares.filter((f) => f.priceEur <= q.maxPriceEur);
  cacheSet(cacheKey, filtered);
  return filtered;
}

function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** TEST-ONLY: clear the in-memory cache. */
export function _resetCacheForTests(): void {
  cache.clear();
  lastRequestAt = 0;
}
