/**
 * Static airport catalogue.
 *
 * Covers every IATA referenced anywhere in REGIONS (and a handful of common
 * European hubs on top). Used as a backstop so the picker's autocomplete can
 * show airports that aren't in the Ryanair active-airports list — Wizz Air
 * hubs (DTM, KTW, RIX, SOF, …), regional German airports (HAJ, NUE, …), etc.
 *
 * The route handler merges this with the Ryanair list, dedup'd by IATA with
 * the Ryanair entry winning ties (its lat/lon and country-code data are
 * authoritative for the Ryanair-served subset).
 *
 * Coordinates are airport reference points, accurate to ~0.001° — fine for
 * the weather-lookup use case (a city-block of slop doesn't move the forecast).
 */

import type { Airport } from '@/types';

export const AIRPORT_CATALOGUE: Airport[] = [
  // ── Deutschsprachiger Raum ───────────────────────────────────────────────
  { iata: 'VIE', name: 'Vienna International', cityName: 'Wien', countryCode: 'AT', countryName: 'Österreich', lat: 48.1103, lon: 16.5697 },
  { iata: 'BTS', name: 'Bratislava M. R. Štefánik', cityName: 'Bratislava', countryCode: 'SK', countryName: 'Slowakei', lat: 48.1702, lon: 17.2127 },
  { iata: 'SZG', name: 'Salzburg W. A. Mozart', cityName: 'Salzburg', countryCode: 'AT', countryName: 'Österreich', lat: 47.7933, lon: 13.0043 },
  { iata: 'BER', name: 'Berlin Brandenburg', cityName: 'Berlin', countryCode: 'DE', countryName: 'Deutschland', lat: 52.3667, lon: 13.5033 },
  { iata: 'LEJ', name: 'Leipzig/Halle', cityName: 'Leipzig', countryCode: 'DE', countryName: 'Deutschland', lat: 51.4324, lon: 12.2416 },
  { iata: 'MUC', name: 'Munich Franz Josef Strauß', cityName: 'München', countryCode: 'DE', countryName: 'Deutschland', lat: 48.3538, lon: 11.7861 },
  { iata: 'MEM', name: 'Memmingen Allgäu', cityName: 'Memmingen', countryCode: 'DE', countryName: 'Deutschland', lat: 47.9888, lon: 10.2395 },
  { iata: 'FRA', name: 'Frankfurt am Main', cityName: 'Frankfurt', countryCode: 'DE', countryName: 'Deutschland', lat: 50.0379, lon: 8.5622 },
  { iata: 'HHN', name: 'Frankfurt-Hahn', cityName: 'Hahn', countryCode: 'DE', countryName: 'Deutschland', lat: 49.9487, lon: 7.2639 },
  { iata: 'FKB', name: 'Karlsruhe/Baden-Baden', cityName: 'Karlsruhe', countryCode: 'DE', countryName: 'Deutschland', lat: 48.7794, lon: 8.0805 },
  { iata: 'FMO', name: 'Münster/Osnabrück', cityName: 'Münster', countryCode: 'DE', countryName: 'Deutschland', lat: 52.1346, lon: 7.6848 },
  { iata: 'PAD', name: 'Paderborn/Lippstadt', cityName: 'Paderborn', countryCode: 'DE', countryName: 'Deutschland', lat: 51.6141, lon: 8.6163 },
  { iata: 'DTM', name: 'Dortmund', cityName: 'Dortmund', countryCode: 'DE', countryName: 'Deutschland', lat: 51.5180, lon: 7.6123 },
  { iata: 'DUS', name: 'Düsseldorf', cityName: 'Düsseldorf', countryCode: 'DE', countryName: 'Deutschland', lat: 51.2895, lon: 6.7668 },
  { iata: 'NRN', name: 'Weeze (Niederrhein)', cityName: 'Weeze', countryCode: 'DE', countryName: 'Deutschland', lat: 51.6024, lon: 6.1422 },
  { iata: 'CGN', name: 'Cologne/Bonn', cityName: 'Köln', countryCode: 'DE', countryName: 'Deutschland', lat: 50.8659, lon: 7.1427 },
  { iata: 'HAJ', name: 'Hannover', cityName: 'Hannover', countryCode: 'DE', countryName: 'Deutschland', lat: 52.4611, lon: 9.6850 },
  { iata: 'NUE', name: 'Nuremberg', cityName: 'Nürnberg', countryCode: 'DE', countryName: 'Deutschland', lat: 49.4987, lon: 11.0780 },
  { iata: 'ZRH', name: 'Zurich', cityName: 'Zürich', countryCode: 'CH', countryName: 'Schweiz', lat: 47.4647, lon: 8.5492 },
  { iata: 'GVA', name: 'Geneva', cityName: 'Genf', countryCode: 'CH', countryName: 'Schweiz', lat: 46.2381, lon: 6.1090 },

  // ── Westeuropa ───────────────────────────────────────────────────────────
  { iata: 'LHR', name: 'London Heathrow', cityName: 'London', countryCode: 'GB', countryName: 'Großbritannien', lat: 51.4700, lon: -0.4543 },
  { iata: 'LGW', name: 'London Gatwick', cityName: 'London', countryCode: 'GB', countryName: 'Großbritannien', lat: 51.1481, lon: -0.1903 },
  { iata: 'STN', name: 'London Stansted', cityName: 'London', countryCode: 'GB', countryName: 'Großbritannien', lat: 51.8849, lon: 0.2350 },
  { iata: 'LTN', name: 'London Luton', cityName: 'London', countryCode: 'GB', countryName: 'Großbritannien', lat: 51.8747, lon: -0.3683 },
  { iata: 'CDG', name: 'Paris Charles de Gaulle', cityName: 'Paris', countryCode: 'FR', countryName: 'Frankreich', lat: 49.0097, lon: 2.5479 },
  { iata: 'ORY', name: 'Paris Orly', cityName: 'Paris', countryCode: 'FR', countryName: 'Frankreich', lat: 48.7233, lon: 2.3794 },
  { iata: 'BVA', name: 'Paris Beauvais-Tillé', cityName: 'Beauvais', countryCode: 'FR', countryName: 'Frankreich', lat: 49.4544, lon: 2.1128 },
  { iata: 'AMS', name: 'Amsterdam Schiphol', cityName: 'Amsterdam', countryCode: 'NL', countryName: 'Niederlande', lat: 52.3105, lon: 4.7683 },
  { iata: 'BRU', name: 'Brussels', cityName: 'Brüssel', countryCode: 'BE', countryName: 'Belgien', lat: 50.9014, lon: 4.4844 },
  { iata: 'CRL', name: 'Brussels South Charleroi', cityName: 'Charleroi', countryCode: 'BE', countryName: 'Belgien', lat: 50.4592, lon: 4.4538 },
  { iata: 'NCE', name: 'Nice Côte d\'Azur', cityName: 'Nizza', countryCode: 'FR', countryName: 'Frankreich', lat: 43.6584, lon: 7.2159 },
  { iata: 'MRS', name: 'Marseille Provence', cityName: 'Marseille', countryCode: 'FR', countryName: 'Frankreich', lat: 43.4393, lon: 5.2214 },
  { iata: 'TLS', name: 'Toulouse-Blagnac', cityName: 'Toulouse', countryCode: 'FR', countryName: 'Frankreich', lat: 43.6293, lon: 1.3637 },

  // ── Iberien ──────────────────────────────────────────────────────────────
  { iata: 'BCN', name: 'Barcelona-El Prat', cityName: 'Barcelona', countryCode: 'ES', countryName: 'Spanien', lat: 41.2974, lon: 2.0833 },
  { iata: 'GRO', name: 'Girona-Costa Brava', cityName: 'Girona', countryCode: 'ES', countryName: 'Spanien', lat: 41.9010, lon: 2.7606 },
  { iata: 'REU', name: 'Reus', cityName: 'Reus', countryCode: 'ES', countryName: 'Spanien', lat: 41.1474, lon: 1.1672 },
  { iata: 'MAD', name: 'Madrid Barajas', cityName: 'Madrid', countryCode: 'ES', countryName: 'Spanien', lat: 40.4936, lon: -3.5668 },
  { iata: 'VLC', name: 'Valencia', cityName: 'Valencia', countryCode: 'ES', countryName: 'Spanien', lat: 39.4893, lon: -0.4815 },
  { iata: 'SVQ', name: 'Seville', cityName: 'Sevilla', countryCode: 'ES', countryName: 'Spanien', lat: 37.4180, lon: -5.8931 },
  { iata: 'BIO', name: 'Bilbao', cityName: 'Bilbao', countryCode: 'ES', countryName: 'Spanien', lat: 43.3011, lon: -2.9106 },
  { iata: 'LIS', name: 'Lisbon', cityName: 'Lissabon', countryCode: 'PT', countryName: 'Portugal', lat: 38.7813, lon: -9.1359 },
  { iata: 'OPO', name: 'Porto', cityName: 'Porto', countryCode: 'PT', countryName: 'Portugal', lat: 41.2371, lon: -8.6701 },
  { iata: 'FAO', name: 'Faro', cityName: 'Faro', countryCode: 'PT', countryName: 'Portugal', lat: 37.0144, lon: -7.9659 },

  // ── Italien & Mittelmeer ─────────────────────────────────────────────────
  { iata: 'LIN', name: 'Milan Linate', cityName: 'Mailand', countryCode: 'IT', countryName: 'Italien', lat: 45.4451, lon: 9.2767 },
  { iata: 'MXP', name: 'Milan Malpensa', cityName: 'Mailand', countryCode: 'IT', countryName: 'Italien', lat: 45.6306, lon: 8.7281 },
  { iata: 'BGY', name: 'Milan Bergamo (Orio al Serio)', cityName: 'Bergamo', countryCode: 'IT', countryName: 'Italien', lat: 45.6739, lon: 9.7042 },
  { iata: 'FCO', name: 'Rome Fiumicino', cityName: 'Rom', countryCode: 'IT', countryName: 'Italien', lat: 41.8003, lon: 12.2389 },
  { iata: 'CIA', name: 'Rome Ciampino', cityName: 'Rom', countryCode: 'IT', countryName: 'Italien', lat: 41.7994, lon: 12.5949 },
  { iata: 'NAP', name: 'Naples', cityName: 'Neapel', countryCode: 'IT', countryName: 'Italien', lat: 40.8860, lon: 14.2908 },
  { iata: 'CTA', name: 'Catania-Fontanarossa', cityName: 'Catania', countryCode: 'IT', countryName: 'Italien', lat: 37.4668, lon: 15.0664 },
  { iata: 'PMI', name: 'Palma de Mallorca', cityName: 'Palma', countryCode: 'ES', countryName: 'Spanien', lat: 39.5517, lon: 2.7388 },
  { iata: 'AGP', name: 'Málaga-Costa del Sol', cityName: 'Málaga', countryCode: 'ES', countryName: 'Spanien', lat: 36.6749, lon: -4.4991 },
  { iata: 'ALC', name: 'Alicante-Elche', cityName: 'Alicante', countryCode: 'ES', countryName: 'Spanien', lat: 38.2822, lon: -0.5582 },
  { iata: 'MLA', name: 'Malta', cityName: 'Malta', countryCode: 'MT', countryName: 'Malta', lat: 35.8575, lon: 14.4775 },

  // ── Mitteleuropa & Polen ─────────────────────────────────────────────────
  { iata: 'PRG', name: 'Prague Václav Havel', cityName: 'Prag', countryCode: 'CZ', countryName: 'Tschechien', lat: 50.1008, lon: 14.2632 },
  { iata: 'WAW', name: 'Warsaw Chopin', cityName: 'Warschau', countryCode: 'PL', countryName: 'Polen', lat: 52.1657, lon: 20.9671 },
  { iata: 'WMI', name: 'Warsaw Modlin', cityName: 'Warschau', countryCode: 'PL', countryName: 'Polen', lat: 52.4511, lon: 20.6517 },
  { iata: 'KTW', name: 'Katowice', cityName: 'Kattowitz', countryCode: 'PL', countryName: 'Polen', lat: 50.4743, lon: 19.0800 },
  { iata: 'GDN', name: 'Gdańsk Lech Wałęsa', cityName: 'Danzig', countryCode: 'PL', countryName: 'Polen', lat: 54.3776, lon: 18.4662 },
  { iata: 'POZ', name: 'Poznań-Ławica', cityName: 'Posen', countryCode: 'PL', countryName: 'Polen', lat: 52.4210, lon: 16.8263 },
  { iata: 'WRO', name: 'Wrocław Copernicus', cityName: 'Breslau', countryCode: 'PL', countryName: 'Polen', lat: 51.1027, lon: 16.8858 },

  // ── Südosteuropa ────────────────────────────────────────────────────────
  { iata: 'BUD', name: 'Budapest Ferenc Liszt', cityName: 'Budapest', countryCode: 'HU', countryName: 'Ungarn', lat: 47.4395, lon: 19.2618 },
  { iata: 'OTP', name: 'Bucharest Henri Coandă (Otopeni)', cityName: 'Bukarest', countryCode: 'RO', countryName: 'Rumänien', lat: 44.5722, lon: 26.1022 },
  { iata: 'BBU', name: 'Bucharest Băneasa', cityName: 'Bukarest', countryCode: 'RO', countryName: 'Rumänien', lat: 44.5031, lon: 26.1022 },
  { iata: 'CLJ', name: 'Cluj-Napoca', cityName: 'Cluj-Napoca', countryCode: 'RO', countryName: 'Rumänien', lat: 46.7852, lon: 23.6862 },
  { iata: 'IAS', name: 'Iași', cityName: 'Iași', countryCode: 'RO', countryName: 'Rumänien', lat: 47.1786, lon: 27.6206 },
  { iata: 'TSR', name: 'Timișoara Traian Vuia', cityName: 'Timișoara', countryCode: 'RO', countryName: 'Rumänien', lat: 45.8099, lon: 21.3379 },
  { iata: 'SOF', name: 'Sofia', cityName: 'Sofia', countryCode: 'BG', countryName: 'Bulgarien', lat: 42.6952, lon: 23.4063 },

  // ── Balkan & östliches Mittelmeer ────────────────────────────────────────
  { iata: 'BEG', name: 'Belgrade Nikola Tesla', cityName: 'Belgrad', countryCode: 'RS', countryName: 'Serbien', lat: 44.8184, lon: 20.3091 },
  { iata: 'SKP', name: 'Skopje', cityName: 'Skopje', countryCode: 'MK', countryName: 'Nordmazedonien', lat: 41.9616, lon: 21.6214 },
  { iata: 'TIA', name: 'Tirana Mother Teresa', cityName: 'Tirana', countryCode: 'AL', countryName: 'Albanien', lat: 41.4147, lon: 19.7206 },
  { iata: 'ATH', name: 'Athens Eleftherios Venizelos', cityName: 'Athen', countryCode: 'GR', countryName: 'Griechenland', lat: 37.9364, lon: 23.9445 },
  { iata: 'LCA', name: 'Larnaca', cityName: 'Larnaka', countryCode: 'CY', countryName: 'Zypern', lat: 34.8751, lon: 33.6249 },

  // ── Nord- & Baltikum ─────────────────────────────────────────────────────
  { iata: 'DUB', name: 'Dublin', cityName: 'Dublin', countryCode: 'IE', countryName: 'Irland', lat: 53.4213, lon: -6.2701 },
  { iata: 'CPH', name: 'Copenhagen Kastrup', cityName: 'Kopenhagen', countryCode: 'DK', countryName: 'Dänemark', lat: 55.6181, lon: 12.6561 },
  { iata: 'ARN', name: 'Stockholm Arlanda', cityName: 'Stockholm', countryCode: 'SE', countryName: 'Schweden', lat: 59.6519, lon: 17.9186 },
  { iata: 'NYO', name: 'Stockholm Skavsta', cityName: 'Nyköping', countryCode: 'SE', countryName: 'Schweden', lat: 58.7886, lon: 16.9122 },
  { iata: 'VST', name: 'Stockholm Västerås', cityName: 'Västerås', countryCode: 'SE', countryName: 'Schweden', lat: 59.5894, lon: 16.6336 },
  { iata: 'OSL', name: 'Oslo Gardermoen', cityName: 'Oslo', countryCode: 'NO', countryName: 'Norwegen', lat: 60.1939, lon: 11.1004 },
  { iata: 'TRF', name: 'Sandefjord-Torp', cityName: 'Sandefjord', countryCode: 'NO', countryName: 'Norwegen', lat: 59.1867, lon: 10.2586 },
  { iata: 'HEL', name: 'Helsinki-Vantaa', cityName: 'Helsinki', countryCode: 'FI', countryName: 'Finnland', lat: 60.3172, lon: 24.9633 },
  { iata: 'RIX', name: 'Riga', cityName: 'Riga', countryCode: 'LV', countryName: 'Lettland', lat: 56.9236, lon: 23.9711 },
  { iata: 'VNO', name: 'Vilnius', cityName: 'Vilnius', countryCode: 'LT', countryName: 'Litauen', lat: 54.6341, lon: 25.2858 },
  { iata: 'TLL', name: 'Tallinn Lennart Meri', cityName: 'Tallinn', countryCode: 'EE', countryName: 'Estland', lat: 59.4133, lon: 24.8328 },
  { iata: 'KEF', name: 'Reykjavík Keflavík', cityName: 'Reykjavík', countryCode: 'IS', countryName: 'Island', lat: 63.9850, lon: -22.6056 },
];
