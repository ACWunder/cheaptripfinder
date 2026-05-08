import { z } from 'zod';

/**
 * Schemas for the unofficial Ryanair endpoints.
 *
 * Design notes:
 * - Use `.passthrough()` on objects we don't fully control — Ryanair adds
 *   fields without notice, and rejecting on unknowns would break the app
 *   for no real benefit.
 * - Be STRICT on the fields we actually use. If `priceEur` shape changes,
 *   we want to fail loudly at the boundary, not silently produce €NaN.
 * - These shapes are reverse-engineered from public docs and the ryanair-py
 *   GitHub project. Treat them as best-effort, not contracts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// /views/locate/5/airports/en/active
// ─────────────────────────────────────────────────────────────────────────────

const RyanairAirportSchema = z
  .object({
    code: z.string().length(3),
    name: z.string(),
    city: z
      .object({
        name: z.string(),
        code: z.string().optional(),
      })
      .passthrough(),
    country: z
      .object({
        code: z.string(), // alpha-2
        name: z.string(),
      })
      .passthrough(),
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

export const RyanairActiveAirportsSchema = z.array(RyanairAirportSchema);
export type RyanairAirport = z.infer<typeof RyanairAirportSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /farfnd/v4/roundTripFares
// ─────────────────────────────────────────────────────────────────────────────

const RyanairFlightLegSchema = z
  .object({
    departureAirport: z
      .object({
        iataCode: z.string().length(3),
        name: z.string().optional(),
        countryName: z.string().optional(),
        city: z
          .object({ name: z.string().optional() })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    arrivalAirport: z
      .object({
        iataCode: z.string().length(3),
        name: z.string().optional(),
        countryName: z.string().optional(),
        city: z
          .object({ name: z.string().optional() })
          .passthrough()
          .optional(),
      })
      .passthrough(),
    departureDate: z.string(), // ISO timestamp like "2025-06-13T07:00:00"
    price: z
      .object({
        value: z.number(),
        currencyCode: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const RyanairRoundTripFareSchema = z
  .object({
    outbound: RyanairFlightLegSchema,
    inbound: RyanairFlightLegSchema,
    summary: z
      .object({
        price: z
          .object({
            value: z.number(),
            currencyCode: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export const RyanairRoundTripFaresResponseSchema = z
  .object({
    fares: z.array(RyanairRoundTripFareSchema),
    // size/total/etc. exist but we don't need them
  })
  .passthrough();

export type RyanairRoundTripFare = z.infer<typeof RyanairRoundTripFareSchema>;
export type RyanairRoundTripFaresResponse = z.infer<typeof RyanairRoundTripFaresResponseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// /farfnd/v4/oneWayFares/{origin}/{destination}/cheapestPerDay
//
// Returns one cheapest fare per day for a single route within one calendar
// month. Used to build a true daily availability calendar — the only way to
// get more than one option per (origin, destination) without per-day calls.
// ─────────────────────────────────────────────────────────────────────────────

const RyanairCheapestPerDayFareSchema = z
  .object({
    day: z.string(), // YYYY-MM-DD
    arrivalDate: z.string().nullable(),
    departureDate: z.string().nullable(),
    price: z
      .object({
        value: z.number(),
        currencyCode: z.string(),
      })
      .passthrough()
      .nullable(),
    soldOut: z.boolean().optional(),
    unavailable: z.boolean().optional(),
  })
  .passthrough();

export const RyanairCheapestPerDayResponseSchema = z
  .object({
    outbound: z
      .object({
        fares: z.array(RyanairCheapestPerDayFareSchema),
      })
      .passthrough(),
  })
  .passthrough();

export type RyanairCheapestPerDayFare = z.infer<typeof RyanairCheapestPerDayFareSchema>;
export type RyanairCheapestPerDayResponse = z.infer<typeof RyanairCheapestPerDayResponseSchema>;
