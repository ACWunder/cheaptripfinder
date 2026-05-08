/**
 * Curated region presets — sets of airports near a city center.
 *
 * Ground times are *typical, public-transport+a-bit-of-walking* estimates
 * for getting from the city's main station to the airport. Don't sweat them
 * — they're only used to apply a small ranking penalty for inconvenient
 * airports. The user can toggle individual airports off in the UI anyway.
 *
 * To add a region, append to REGIONS. The IATA codes must match those
 * returned by Ryanair's active-airports endpoint (and our airports.json
 * fixture, if you want it to work in fixtures mode).
 */

import type { Region } from '@/types';

export const REGIONS: Record<string, Region> = {
  // Deutschsprachiger Raum
  vienna: {
    id: 'vienna',
    label: 'Vienna area',
    airports: [
      { iata: 'VIE', name: 'Vienna', groundMinutesFromCenter: 25 },
      { iata: 'BTS', name: 'Bratislava', groundMinutesFromCenter: 75 },
    ],
  },
  salzburg: {
    id: 'salzburg',
    label: 'Salzburg area',
    airports: [{ iata: 'SZG', name: 'Salzburg', groundMinutesFromCenter: 20 }],
  },
  berlin: {
    id: 'berlin',
    label: 'Berlin area',
    airports: [
      { iata: 'BER', name: 'Berlin Brandenburg', groundMinutesFromCenter: 45 },
      { iata: 'LEJ', name: 'Leipzig/Halle', groundMinutesFromCenter: 90 },
    ],
  },
  munich: {
    id: 'munich',
    label: 'Munich area',
    airports: [
      { iata: 'MUC', name: 'Munich', groundMinutesFromCenter: 45 },
      { iata: 'MEM', name: 'Memmingen', groundMinutesFromCenter: 110 },
    ],
  },
  frankfurt: {
    id: 'frankfurt',
    label: 'Frankfurt area',
    airports: [
      { iata: 'FRA', name: 'Frankfurt Main', groundMinutesFromCenter: 15 },
      { iata: 'HHN', name: 'Frankfurt Hahn', groundMinutesFromCenter: 105 },
    ],
  },
  karlsruhe: {
    id: 'karlsruhe',
    label: 'Karlsruhe / Baden-Baden area',
    airports: [{ iata: 'FKB', name: 'Karlsruhe/Baden-Baden', groundMinutesFromCenter: 60 }],
  },
  munster: {
    id: 'munster',
    label: 'Münster area',
    airports: [
      { iata: 'FMO', name: 'Münster/Osnabrück', groundMinutesFromCenter: 30 },
      { iata: 'PAD', name: 'Paderborn/Lippstadt', groundMinutesFromCenter: 35 },
    ],
  },
  dortmund: {
    id: 'dortmund',
    label: 'Dortmund area',
    airports: [{ iata: 'DTM', name: 'Dortmund', groundMinutesFromCenter: 25 }],
  },
  dusseldorf: {
    id: 'dusseldorf',
    label: 'Düsseldorf area',
    airports: [
      { iata: 'DUS', name: 'Düsseldorf', groundMinutesFromCenter: 20 },
      { iata: 'NRN', name: 'Weeze', groundMinutesFromCenter: 75 },
    ],
  },
  cologne: {
    id: 'cologne',
    label: 'Cologne/Bonn area',
    airports: [
      { iata: 'CGN', name: 'Cologne/Bonn', groundMinutesFromCenter: 20 },
      { iata: 'NRN', name: 'Weeze', groundMinutesFromCenter: 90 },
    ],
  },
  weeze: {
    id: 'weeze',
    label: 'Weeze area',
    airports: [{ iata: 'NRN', name: 'Weeze', groundMinutesFromCenter: 15 }],
  },
  hannover: {
    id: 'hannover',
    label: 'Hannover area',
    airports: [{ iata: 'HAJ', name: 'Hannover', groundMinutesFromCenter: 25 }],
  },
  nuremberg: {
    id: 'nuremberg',
    label: 'Nuremberg area',
    airports: [{ iata: 'NUE', name: 'Nuremberg', groundMinutesFromCenter: 15 }],
  },
  zurich: {
    id: 'zurich',
    label: 'Zurich area',
    airports: [{ iata: 'ZRH', name: 'Zurich', groundMinutesFromCenter: 15 }],
  },
  geneva: {
    id: 'geneva',
    label: 'Geneva area',
    airports: [{ iata: 'GVA', name: 'Geneva', groundMinutesFromCenter: 15 }],
  },

  // Westeuropa
  london: {
    id: 'london',
    label: 'London area',
    airports: [
      { iata: 'LHR', name: 'Heathrow', groundMinutesFromCenter: 45 },
      { iata: 'LGW', name: 'Gatwick', groundMinutesFromCenter: 50 },
      { iata: 'STN', name: 'Stansted', groundMinutesFromCenter: 55 },
      { iata: 'LTN', name: 'Luton', groundMinutesFromCenter: 60 },
    ],
  },
  paris: {
    id: 'paris',
    label: 'Paris area',
    airports: [
      { iata: 'CDG', name: 'Charles de Gaulle', groundMinutesFromCenter: 50 },
      { iata: 'ORY', name: 'Orly', groundMinutesFromCenter: 40 },
      { iata: 'BVA', name: 'Beauvais', groundMinutesFromCenter: 95 },
    ],
  },
  amsterdam: {
    id: 'amsterdam',
    label: 'Amsterdam area',
    airports: [{ iata: 'AMS', name: 'Schiphol', groundMinutesFromCenter: 20 }],
  },
  brussels: {
    id: 'brussels',
    label: 'Brussels area',
    airports: [
      { iata: 'BRU', name: 'Brussels', groundMinutesFromCenter: 20 },
      { iata: 'CRL', name: 'Charleroi', groundMinutesFromCenter: 75 },
    ],
  },
  nice: {
    id: 'nice',
    label: 'Nice area',
    airports: [{ iata: 'NCE', name: 'Nice', groundMinutesFromCenter: 25 }],
  },
  marseille: {
    id: 'marseille',
    label: 'Marseille area',
    airports: [{ iata: 'MRS', name: 'Marseille', groundMinutesFromCenter: 35 }],
  },
  toulouse: {
    id: 'toulouse',
    label: 'Toulouse area',
    airports: [{ iata: 'TLS', name: 'Toulouse', groundMinutesFromCenter: 30 }],
  },

  // Iberien
  barcelona: {
    id: 'barcelona',
    label: 'Barcelona area',
    airports: [
      { iata: 'BCN', name: 'El Prat', groundMinutesFromCenter: 35 },
      { iata: 'GRO', name: 'Girona', groundMinutesFromCenter: 80 },
      { iata: 'REU', name: 'Reus', groundMinutesFromCenter: 90 },
    ],
  },
  madrid: {
    id: 'madrid',
    label: 'Madrid area',
    airports: [{ iata: 'MAD', name: 'Madrid Barajas', groundMinutesFromCenter: 30 }],
  },
  valencia: {
    id: 'valencia',
    label: 'Valencia area',
    airports: [{ iata: 'VLC', name: 'Valencia', groundMinutesFromCenter: 30 }],
  },
  seville: {
    id: 'seville',
    label: 'Seville area',
    airports: [{ iata: 'SVQ', name: 'Seville', groundMinutesFromCenter: 30 }],
  },
  bilbao: {
    id: 'bilbao',
    label: 'Bilbao area',
    airports: [{ iata: 'BIO', name: 'Bilbao', groundMinutesFromCenter: 30 }],
  },
  lisbon: {
    id: 'lisbon',
    label: 'Lisbon area',
    airports: [{ iata: 'LIS', name: 'Lisbon', groundMinutesFromCenter: 25 }],
  },
  porto: {
    id: 'porto',
    label: 'Porto area',
    airports: [{ iata: 'OPO', name: 'Porto', groundMinutesFromCenter: 30 }],
  },
  faro: {
    id: 'faro',
    label: 'Faro area',
    airports: [{ iata: 'FAO', name: 'Faro', groundMinutesFromCenter: 25 }],
  },

  // Italien & Mittelmeer
  milan: {
    id: 'milan',
    label: 'Milan area',
    airports: [
      { iata: 'LIN', name: 'Linate', groundMinutesFromCenter: 25 },
      { iata: 'MXP', name: 'Malpensa', groundMinutesFromCenter: 60 },
      { iata: 'BGY', name: 'Bergamo', groundMinutesFromCenter: 70 },
    ],
  },
  rome: {
    id: 'rome',
    label: 'Rome area',
    airports: [
      { iata: 'FCO', name: 'Fiumicino', groundMinutesFromCenter: 35 },
      { iata: 'CIA', name: 'Ciampino', groundMinutesFromCenter: 35 },
    ],
  },
  malta: {
    id: 'malta',
    label: 'Malta',
    airports: [{ iata: 'MLA', name: 'Malta', groundMinutesFromCenter: 30 }],
  },

  // Mitteleuropa & Polen
  prague: {
    id: 'prague',
    label: 'Prague area',
    airports: [{ iata: 'PRG', name: 'Prague', groundMinutesFromCenter: 35 }],
  },
  warsaw: {
    id: 'warsaw',
    label: 'Warsaw area',
    airports: [
      { iata: 'WAW', name: 'Chopin', groundMinutesFromCenter: 25 },
      { iata: 'WMI', name: 'Modlin', groundMinutesFromCenter: 60 },
    ],
  },
  katowice: {
    id: 'katowice',
    label: 'Katowice area',
    airports: [{ iata: 'KTW', name: 'Katowice', groundMinutesFromCenter: 50 }],
  },
  gdansk: {
    id: 'gdansk',
    label: 'Gdansk area',
    airports: [{ iata: 'GDN', name: 'Gdansk', groundMinutesFromCenter: 25 }],
  },
  poznan: {
    id: 'poznan',
    label: 'Poznan area',
    airports: [{ iata: 'POZ', name: 'Poznan', groundMinutesFromCenter: 25 }],
  },
  wroclaw: {
    id: 'wroclaw',
    label: 'Wroclaw area',
    airports: [{ iata: 'WRO', name: 'Wroclaw', groundMinutesFromCenter: 25 }],
  },

  // Südosteuropa
  budapest: {
    id: 'budapest',
    label: 'Budapest area',
    airports: [{ iata: 'BUD', name: 'Budapest', groundMinutesFromCenter: 35 }],
  },
  bucharest: {
    id: 'bucharest',
    label: 'Bucharest area',
    airports: [
      { iata: 'OTP', name: 'Otopeni', groundMinutesFromCenter: 40 },
      { iata: 'BBU', name: 'Băneasa', groundMinutesFromCenter: 25 },
    ],
  },
  cluj: {
    id: 'cluj',
    label: 'Cluj-Napoca area',
    airports: [{ iata: 'CLJ', name: 'Cluj-Napoca', groundMinutesFromCenter: 25 }],
  },
  iasi: {
    id: 'iasi',
    label: 'Iași area',
    airports: [{ iata: 'IAS', name: 'Iași', groundMinutesFromCenter: 25 }],
  },
  timisoara: {
    id: 'timisoara',
    label: 'Timișoara area',
    airports: [{ iata: 'TSR', name: 'Timișoara', groundMinutesFromCenter: 25 }],
  },
  sofia: {
    id: 'sofia',
    label: 'Sofia area',
    airports: [{ iata: 'SOF', name: 'Sofia', groundMinutesFromCenter: 35 }],
  },

  // Balkan & östliches Mittelmeer
  belgrade: {
    id: 'belgrade',
    label: 'Belgrade area',
    airports: [{ iata: 'BEG', name: 'Belgrade', groundMinutesFromCenter: 30 }],
  },
  skopje: {
    id: 'skopje',
    label: 'Skopje area',
    airports: [{ iata: 'SKP', name: 'Skopje', groundMinutesFromCenter: 25 }],
  },
  tirana: {
    id: 'tirana',
    label: 'Tirana area',
    airports: [{ iata: 'TIA', name: 'Tirana', groundMinutesFromCenter: 30 }],
  },
  athens: {
    id: 'athens',
    label: 'Athens area',
    airports: [{ iata: 'ATH', name: 'Athens', groundMinutesFromCenter: 50 }],
  },
  larnaca: {
    id: 'larnaca',
    label: 'Larnaca area',
    airports: [{ iata: 'LCA', name: 'Larnaca', groundMinutesFromCenter: 35 }],
  },

  // Nord- & Baltikum
  dublin: {
    id: 'dublin',
    label: 'Dublin area',
    airports: [{ iata: 'DUB', name: 'Dublin', groundMinutesFromCenter: 30 }],
  },
  copenhagen: {
    id: 'copenhagen',
    label: 'Copenhagen area',
    airports: [{ iata: 'CPH', name: 'Copenhagen', groundMinutesFromCenter: 20 }],
  },
  stockholm: {
    id: 'stockholm',
    label: 'Stockholm area',
    airports: [
      { iata: 'ARN', name: 'Arlanda', groundMinutesFromCenter: 40 },
      { iata: 'NYO', name: 'Skavsta', groundMinutesFromCenter: 80 },
      { iata: 'VST', name: 'Västerås', groundMinutesFromCenter: 75 },
    ],
  },
  oslo: {
    id: 'oslo',
    label: 'Oslo area',
    airports: [
      { iata: 'OSL', name: 'Gardermoen', groundMinutesFromCenter: 25 },
      { iata: 'TRF', name: 'Sandefjord/Torp', groundMinutesFromCenter: 110 },
    ],
  },
  helsinki: {
    id: 'helsinki',
    label: 'Helsinki area',
    airports: [{ iata: 'HEL', name: 'Helsinki', groundMinutesFromCenter: 30 }],
  },
  riga: {
    id: 'riga',
    label: 'Riga area',
    airports: [{ iata: 'RIX', name: 'Riga', groundMinutesFromCenter: 25 }],
  },
  vilnius: {
    id: 'vilnius',
    label: 'Vilnius area',
    airports: [{ iata: 'VNO', name: 'Vilnius', groundMinutesFromCenter: 20 }],
  },
  tallinn: {
    id: 'tallinn',
    label: 'Tallinn area',
    airports: [{ iata: 'TLL', name: 'Tallinn', groundMinutesFromCenter: 20 }],
  },
  reykjavik: {
    id: 'reykjavik',
    label: 'Reykjavík area',
    airports: [{ iata: 'KEF', name: 'Keflavík', groundMinutesFromCenter: 50 }],
  },
};

export function getRegion(id: string): Region | null {
  return REGIONS[id] ?? null;
}

export function listRegions(): Region[] {
  return Object.values(REGIONS);
}
