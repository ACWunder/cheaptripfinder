/**
 * Domain types shared across the app.
 *
 * Keep these LEAN — they are the contract between modules. External API
 * shapes (Ryanair, Open-Meteo) live next to their wrappers and are mapped
 * into these types at the boundary.
 */

export type IataCode = string; // 3-letter, uppercase. Not branded to avoid friction; validated at boundaries.

export interface Airport {
  iata: IataCode;
  name: string;
  cityName: string;
  countryCode: string; // ISO 3166-1 alpha-2
  countryName: string;
  lat: number;
  lon: number;
}

export interface RegionAirport {
  iata: IataCode;
  name: string;
  /** Approx. minutes from the region's "center" by public transport / car. */
  groundMinutesFromCenter: number;
}

export interface Region {
  id: string;
  label: string;
  airports: RegionAirport[];
}

/** A single round-trip fare option from one origin to one destination. */
export interface FareOption {
  origin: IataCode;
  destination: IataCode;
  destinationCityName: string;
  destinationCountryCode: string;
  outboundPriceEur: number;
  inboundPriceEur: number;
  priceEur: number;
  outboundDate: string; // ISO date, no time
  inboundDate: string; // ISO date, no time
  outboundDepartureAt: string; // ISO timestamp
  inboundDepartureAt: string; // ISO timestamp
  /** Direct ryanair.com booking URL for the outbound leg. */
  outboundBookingUrl: string;
  /** Direct ryanair.com booking URL for the inbound leg. */
  inboundBookingUrl: string;
  /** Direct ryanair.com booking URL for THIS specific fare. */
  bookingUrl: string;
}

/** The cheapest option from a *region* (set of airports) to a destination. */
export interface RegionBestFare {
  destination: IataCode;
  destinationCityName: string;
  destinationCountryCode: string;
  bestFare: FareOption;
  /** Ground time from region center to the chosen origin airport. */
  groundMinutesFromCenter: number;
}

export interface WeatherSummary {
  /** Date the forecast/normal was queried for. */
  date: string;
  tempMinC: number;
  tempMaxC: number;
  precipitationProbabilityPct: number;
  sunshineHours: number;
  /** Whether this is a real forecast (≤16 days) or climatological normal. */
  source: 'forecast' | 'climate-normal';
}

export interface WeatherScoreBreakdown {
  tempPoints: number;
  precipPoints: number;
  sunshinePoints: number;
  total: number;
  /** Human-readable reason strings, for the UI. */
  reasons: string[];
}

export interface RankedDestination {
  destination: IataCode;
  destinationCityName: string;
  destinationCountryCode: string;
  fromRegionA: RegionBestFare;
  fromRegionB: RegionBestFare;
  combinedPriceEur: number;
  /** Combined price + ground-time penalty, used for ranking. */
  adjustedPriceEur: number;
  weather: WeatherSummary | null; // null if weather lookup failed
  weatherScore: WeatherScoreBreakdown | null;
  /** Final score: -adjustedPrice + weatherScore.total * weatherWeight. Higher = better. */
  score: number;
}

export interface SearchInput {
  regionAAirports: IataCode[];
  regionBAirports: IataCode[];
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  tripDurationDaysMin: number;
  tripDurationDaysMax: number;
  maxPricePerPersonEur: number;
  /** 0 = pure cheapness, 1 = balanced, 2 = weather-first */
  weatherWeight: number;
}
