import { NextResponse } from 'next/server';

import { AIRPORT_CATALOGUE } from '@/lib/airports/catalogue';
import { listRegions } from '@/lib/regions';
import { getActiveAirports } from '@/lib/ryanair/client';
import type { Airport } from '@/types';

/**
 * GET /api/airports
 * Returns the airports list (Ryanair active ∪ static catalogue) plus the
 * region presets, in one call. Dedup'd by IATA, with the Ryanair entry
 * winning ties — its data is freshest for Ryanair-served airports, while
 * the catalogue fills in Wizz-only and regional airports.
 */
export async function GET(): Promise<NextResponse> {
  let ryanair: Airport[] = [];
  try {
    ryanair = await getActiveAirports();
  } catch {
    // Non-fatal: fall back to catalogue-only.
  }

  const byIata = new Map<string, Airport>();
  for (const a of AIRPORT_CATALOGUE) byIata.set(a.iata.toUpperCase(), a);
  for (const a of ryanair) byIata.set(a.iata.toUpperCase(), a);

  const airports = Array.from(byIata.values()).sort((a, b) =>
    a.cityName.localeCompare(b.cityName),
  );

  return NextResponse.json({ airports, regions: listRegions() });
}
