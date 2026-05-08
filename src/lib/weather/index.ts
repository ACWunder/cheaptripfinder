/**
 * Weather lookups via Open-Meteo. Free, no API key.
 *
 * Two endpoints:
 *  - /v1/forecast for dates ≤16 days from today
 *  - /v1/climate for further out (climatological normals — less precise but
 *    the best we can do months ahead)
 *
 * If WEATHER_MODE=fixtures, we generate a deterministic-but-plausible
 * synthetic forecast based on (lat, date) so dev works offline. The real
 * Open-Meteo API is fine to hammer in dev — it's free and doesn't blocklist
 * — but fixtures mode is needed when this sandbox can't reach the network.
 */

import type { WeatherSummary } from '@/types';

const FORECAST_HORIZON_DAYS = 16;

interface OpenMeteoForecastResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    sunshine_duration?: number[]; // seconds
  };
}

interface OpenMeteoClimateResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
}

export interface WeatherQuery {
  lat: number;
  lon: number;
  date: string; // YYYY-MM-DD
}

function isFixturesMode(): boolean {
  return process.env.WEATHER_MODE === 'fixtures' || process.env.RYANAIR_MODE === 'fixtures';
}

function daysFromToday(iso: string): number {
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic fixture weather (deterministic per lat+date)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plausible weather without hitting the network.
 * - Temperature roughly tracks latitude (warmer south) and month (warmer summer).
 * - Precipitation/sunshine are deterministic pseudo-random from the seed.
 *
 * Not realistic enough for a product, but realistic enough that the UI shows
 * a meaningful spread across destinations.
 */
function syntheticWeather({ lat, lon, date }: WeatherQuery): WeatherSummary {
  const month = parseInt(date.slice(5, 7), 10); // 1-12
  // Northern hemisphere bias: summer warm, winter cold. Mid-summer = +1, mid-winter = -1.
  const seasonal = Math.cos(((month - 7) / 6) * Math.PI); // peaks at July
  // Latitude effect: ~0.7°C per degree of latitude (very rough).
  const latEffect = (45 - lat) * 0.7;
  const baseHigh = 18 + latEffect + seasonal * 8;
  const high = Math.round(baseHigh * 10) / 10;
  const low = Math.round((high - 8) * 10) / 10;

  // Pseudo-random based on lat+lon+date, in [0,1).
  const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233 + parseInt(date.replaceAll('-', ''), 10) * 0.0001));
  const rand = seed - Math.floor(seed);
  const precip = Math.round(rand * 80); // 0-80%
  const sun = Math.round((10 - rand * 6) * 10) / 10; // 4-10h

  return {
    date,
    tempMinC: low,
    tempMaxC: high,
    precipitationProbabilityPct: precip,
    sunshineHours: sun,
    source: 'forecast',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Real API
// ─────────────────────────────────────────────────────────────────────────────

async function fetchForecast(q: WeatherQuery): Promise<WeatherSummary | null> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(q.lat));
  url.searchParams.set('longitude', String(q.lon));
  url.searchParams.set('start_date', q.date);
  url.searchParams.set('end_date', q.date);
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunshine_duration',
  );
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = (await res.json()) as OpenMeteoForecastResponse;
  const d = json.daily;
  if (!d?.temperature_2m_max?.[0] || !d.temperature_2m_min?.[0]) return null;
  return {
    date: q.date,
    tempMaxC: d.temperature_2m_max[0],
    tempMinC: d.temperature_2m_min[0],
    precipitationProbabilityPct: d.precipitation_probability_max?.[0] ?? 0,
    sunshineHours: (d.sunshine_duration?.[0] ?? 0) / 3600,
    source: 'forecast',
  };
}

async function fetchClimateNormal(q: WeatherQuery): Promise<WeatherSummary | null> {
  const url = new URL('https://climate-api.open-meteo.com/v1/climate');
  url.searchParams.set('latitude', String(q.lat));
  url.searchParams.set('longitude', String(q.lon));
  url.searchParams.set('start_date', q.date);
  url.searchParams.set('end_date', q.date);
  url.searchParams.set('models', 'EC_Earth3P_HR');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum');

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const json = (await res.json()) as OpenMeteoClimateResponse;
  const d = json.daily;
  if (!d?.temperature_2m_max?.[0] || !d.temperature_2m_min?.[0]) return null;
  // Climate API doesn't give precipitation probability; use precipitation_sum
  // as a rough proxy: >5mm forecast → 80% chance, 1-5 → 40%, <1 → 15%.
  const ps = d.precipitation_sum?.[0] ?? 0;
  const precipPct = ps > 5 ? 80 : ps > 1 ? 40 : 15;
  return {
    date: q.date,
    tempMaxC: d.temperature_2m_max[0],
    tempMinC: d.temperature_2m_min[0],
    precipitationProbabilityPct: precipPct,
    sunshineHours: 7, // unknown — assume average for the score
    source: 'climate-normal',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeather(q: WeatherQuery): Promise<WeatherSummary | null> {
  if (isFixturesMode()) {
    return syntheticWeather(q);
  }
  try {
    const days = daysFromToday(q.date);
    if (days <= FORECAST_HORIZON_DAYS && days >= -1) {
      return await fetchForecast(q);
    }
    return await fetchClimateNormal(q);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[weather] lookup failed:', (err as Error).message);
    return null;
  }
}

/** Fetch many in parallel, but with a small concurrency cap to be polite. */
export async function getWeatherBatch(
  queries: Array<WeatherQuery & { key: string }>,
): Promise<Map<string, WeatherSummary | null>> {
  const out = new Map<string, WeatherSummary | null>();
  const CONCURRENCY = 6;
  let i = 0;
  async function worker(): Promise<void> {
    while (i < queries.length) {
      const idx = i++;
      const q = queries[idx];
      if (!q) return;
      const w = await getWeather(q);
      out.set(q.key, w);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queries.length) }, () => worker()));
  return out;
}
