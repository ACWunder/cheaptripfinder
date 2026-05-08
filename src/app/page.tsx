'use client';

import { useState, useEffect, useRef } from 'react';

import type { Airport, RankedDestination, RegionBestFare } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

interface RegionOption {
  id: string;
  label: string;
  airports: string[];
}

const REGION_OPTIONS: RegionOption[] = [
  // Deutschsprachiger Raum
  { id: 'vienna', label: 'Raum Wien', airports: ['VIE', 'BTS'] },
  { id: 'salzburg', label: 'Raum Salzburg', airports: ['SZG'] },
  { id: 'berlin', label: 'Raum Berlin', airports: ['BER', 'LEJ'] },
  { id: 'munich', label: 'Raum München', airports: ['MUC', 'MEM'] },
  { id: 'frankfurt', label: 'Raum Frankfurt', airports: ['FRA', 'HHN'] },
  { id: 'karlsruhe', label: 'Raum Karlsruhe/Baden-Baden', airports: ['FKB'] },
  { id: 'munster', label: 'Raum Münster', airports: ['FMO', 'PAD'] },
  { id: 'dortmund', label: 'Raum Dortmund', airports: ['DTM'] },
  { id: 'dusseldorf', label: 'Raum Düsseldorf', airports: ['DUS', 'NRN'] },
  { id: 'cologne', label: 'Raum Köln/Bonn', airports: ['CGN', 'NRN'] },
  { id: 'weeze', label: 'Raum Weeze', airports: ['NRN'] },
  { id: 'hannover', label: 'Raum Hannover', airports: ['HAJ'] },
  { id: 'nuremberg', label: 'Raum Nürnberg', airports: ['NUE'] },
  { id: 'zurich', label: 'Raum Zürich', airports: ['ZRH'] },
  { id: 'geneva', label: 'Raum Genf', airports: ['GVA'] },
  // Westeuropa
  { id: 'london', label: 'Raum London', airports: ['LHR', 'LGW', 'STN', 'LTN'] },
  { id: 'paris', label: 'Raum Paris', airports: ['CDG', 'ORY', 'BVA'] },
  { id: 'amsterdam', label: 'Raum Amsterdam', airports: ['AMS'] },
  { id: 'brussels', label: 'Raum Brüssel', airports: ['BRU', 'CRL'] },
  { id: 'nice', label: 'Raum Nizza', airports: ['NCE'] },
  { id: 'marseille', label: 'Raum Marseille', airports: ['MRS'] },
  { id: 'toulouse', label: 'Raum Toulouse', airports: ['TLS'] },
  // Iberien
  { id: 'barcelona', label: 'Raum Barcelona', airports: ['BCN', 'GRO', 'REU'] },
  { id: 'madrid', label: 'Raum Madrid', airports: ['MAD'] },
  { id: 'valencia', label: 'Raum Valencia', airports: ['VLC'] },
  { id: 'seville', label: 'Raum Sevilla', airports: ['SVQ'] },
  { id: 'bilbao', label: 'Raum Bilbao', airports: ['BIO'] },
  { id: 'lisbon', label: 'Raum Lissabon', airports: ['LIS'] },
  { id: 'porto', label: 'Raum Porto', airports: ['OPO'] },
  { id: 'faro', label: 'Raum Faro', airports: ['FAO'] },
  // Italien & Mittelmeer
  { id: 'milan', label: 'Raum Mailand', airports: ['LIN', 'MXP', 'BGY'] },
  { id: 'rome', label: 'Raum Rom', airports: ['FCO', 'CIA'] },
  { id: 'malta', label: 'Raum Malta', airports: ['MLA'] },
  // Mitteleuropa & Polen
  { id: 'prague', label: 'Raum Prag', airports: ['PRG'] },
  { id: 'warsaw', label: 'Raum Warschau', airports: ['WAW', 'WMI'] },
  { id: 'katowice', label: 'Raum Kattowitz', airports: ['KTW'] },
  { id: 'gdansk', label: 'Raum Danzig', airports: ['GDN'] },
  { id: 'poznan', label: 'Raum Posen', airports: ['POZ'] },
  { id: 'wroclaw', label: 'Raum Breslau', airports: ['WRO'] },
  // Südosteuropa
  { id: 'budapest', label: 'Raum Budapest', airports: ['BUD'] },
  { id: 'bucharest', label: 'Raum Bukarest', airports: ['OTP', 'BBU'] },
  { id: 'cluj', label: 'Raum Cluj-Napoca', airports: ['CLJ'] },
  { id: 'iasi', label: 'Raum Iași', airports: ['IAS'] },
  { id: 'timisoara', label: 'Raum Timișoara', airports: ['TSR'] },
  { id: 'sofia', label: 'Raum Sofia', airports: ['SOF'] },
  // Balkan & östliches Mittelmeer
  { id: 'belgrade', label: 'Raum Belgrad', airports: ['BEG'] },
  { id: 'skopje', label: 'Raum Skopje', airports: ['SKP'] },
  { id: 'tirana', label: 'Raum Tirana', airports: ['TIA'] },
  { id: 'athens', label: 'Raum Athen', airports: ['ATH'] },
  { id: 'larnaca', label: 'Raum Larnaka', airports: ['LCA'] },
  // Nord- & Baltikum
  { id: 'dublin', label: 'Raum Dublin', airports: ['DUB'] },
  { id: 'copenhagen', label: 'Raum Kopenhagen', airports: ['CPH'] },
  { id: 'stockholm', label: 'Raum Stockholm', airports: ['ARN', 'NYO', 'VST'] },
  { id: 'oslo', label: 'Raum Oslo', airports: ['OSL', 'TRF'] },
  { id: 'helsinki', label: 'Raum Helsinki', airports: ['HEL'] },
  { id: 'riga', label: 'Raum Riga', airports: ['RIX'] },
  { id: 'vilnius', label: 'Raum Vilnius', airports: ['VNO'] },
  { id: 'tallinn', label: 'Raum Tallinn', airports: ['TLL'] },
  { id: 'reykjavik', label: 'Raum Reykjavík', airports: ['KEF'] },
];

const EUROPEAN_COUNTRY_CODES = new Set([
  'AL', 'AT', 'BA', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK',
  'EE', 'ES', 'FI', 'FR', 'GB', 'GI', 'GR', 'HR', 'HU', 'IE',
  'IS', 'IT', 'LT', 'LU', 'LV', 'ME', 'MK', 'MT', 'NL', 'NO',
  'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'UA', 'XK',
]);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResponse {
  counts: {
    regionAFares: number;
    regionBFares: number;
    regionADestinations: number;
    regionBDestinations: number;
    commonDestinations: number;
  };
  results: RankedDestination[];
}

type PickerMode = 'region' | 'airport';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const departureFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function countryFlag(code: string): string {
  return [...code.toUpperCase().slice(0, 2)]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

// ─── Fuzzy airport search ─────────────────────────────────────────────────────

/** Lowercase + strip diacritics so "Düsseldorf" matches "dusseldorf". */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Returns true iff edit distance between a and b is at most 1. Early-exits. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  // Find first diff
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (i === la && i === lb) return true;
  if (la === lb) {
    // substitution: skip one char from each, rest must match
    return a.slice(i + 1) === b.slice(i + 1);
  }
  // insertion/deletion: skip one char from the longer one
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** Score an airport against a normalized query token. Higher = better. 0 = no match. */
function scoreAirportToken(token: string, a: Airport): number {
  if (!token) return 0;
  const iata = a.iata.toLowerCase();
  const city = normalize(a.cityName);
  const name = normalize(a.name);
  const country = normalize(a.countryName);

  if (iata === token) return 1000;
  if (iata.startsWith(token)) return 900;
  if (city === token) return 880;
  if (city.startsWith(token)) return 800;

  // Word-prefix match anywhere in city or name (e.g., "bad" → "Karlsruhe/Baden-Baden").
  for (const word of `${city} ${name}`.split(/[\s/-]+/)) {
    if (word.startsWith(token)) return 700;
  }

  if (city.includes(token)) return 600;
  if (name.includes(token)) return 500;
  if (country.startsWith(token)) return 400;
  if (country.includes(token)) return 300;
  if (iata.includes(token)) return 250;

  // Single-typo tolerance for tokens long enough that it isn't pure noise.
  if (token.length >= 4) {
    if (withinOneEdit(city, token)) return 150;
    for (const word of city.split(/[\s/-]+/)) {
      if (word.length >= 4 && withinOneEdit(word, token)) return 120;
    }
  }
  return 0;
}

/** Score across all whitespace-separated tokens — every token must hit. */
function scoreAirport(query: string, a: Airport): number {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const t of tokens) {
    const s = scoreAirportToken(t, a);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

function getIatas(mode: PickerMode, regionId: string, airports: Airport[]): string[] {
  if (mode === 'region') {
    return REGION_OPTIONS.find((r) => r.id === regionId)?.airports ?? [];
  }
  return airports.map((a) => a.iata);
}

function formatDeparture(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) {
    const datePart = isoTimestamp.slice(0, 10);
    const timeMatch = isoTimestamp.match(/T(\d{2}:\d{2})/);
    const timePart = timeMatch?.[1] ?? '--:--';
    return `${datePart} ${timePart}`;
  }
  return departureFormatter.format(d);
}

function formatEur(amount: number): string {
  return eurFormatter.format(amount);
}

// ─── Icons (inline SVG, no extra deps) ────────────────────────────────────────

function PlaneIcon({ className = 'h-4 w-4' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}

function ArrowIcon({ className = 'h-3 w-3' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7"/>
    </svg>
  );
}

function SparkleIcon({ className = 'h-4 w-4' }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 13.7 8.3 20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2zm6 12 .8 2.7L21 17.5l-2.2.8L18 21l-.8-2.7L15 17.5l2.2-.8L18 14zM6 14l.8 2.7L9 17.5l-2.2.8L6 21l-.8-2.7L3 17.5l2.2-.8L6 14z"/>
    </svg>
  );
}

// ─── AirportPicker ────────────────────────────────────────────────────────────

interface AirportPickerProps {
  label: string;
  badge: string;
  accent: 'indigo' | 'fuchsia';
  allAirports: Airport[];
  airportsLoading: boolean;
  mode: PickerMode;
  onModeChange: (m: PickerMode) => void;
  regionId: string;
  onRegionChange: (id: string) => void;
  selectedAirports: Airport[];
  onSelectedChange: (airports: Airport[]) => void;
}

function AirportPicker({
  label,
  badge,
  accent,
  allAirports,
  airportsLoading,
  mode,
  onModeChange,
  regionId,
  onRegionChange,
  selectedAirports,
  onSelectedChange,
}: AirportPickerProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const europeanAirports = allAirports.filter((a) =>
    EUROPEAN_COUNTRY_CODES.has(a.countryCode.toUpperCase()),
  );

  const filtered =
    search.length >= 1
      ? europeanAirports
          .map((a) => ({ a, s: scoreAirport(search, a) }))
          .filter(({ s }) => s > 0)
          .sort((x, y) => y.s - x.s)
          .slice(0, 25)
          .map(({ a }) => a)
      : [];

  const selectedIatas = new Set(selectedAirports.map((a) => a.iata));

  function toggleAirport(airport: Airport): void {
    if (selectedIatas.has(airport.iata)) {
      onSelectedChange(selectedAirports.filter((a) => a.iata !== airport.iata));
    } else if (selectedAirports.length < 8) {
      onSelectedChange([...selectedAirports, airport]);
      setSearch('');
      setDropdownOpen(false);
    }
  }

  const maxReached = selectedAirports.length >= 8;
  const accentBg = accent === 'indigo' ? 'bg-indigo-500' : 'bg-fuchsia-500';
  const accentRing = accent === 'indigo' ? 'focus:ring-indigo-400/40 focus:border-indigo-400' : 'focus:ring-fuchsia-400/40 focus:border-fuchsia-400';
  const accentText = accent === 'indigo' ? 'text-indigo-600' : 'text-fuchsia-600';
  const accentChipBg = accent === 'indigo' ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900';

  return (
    <div
      className={`relative rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-soft backdrop-blur-md sm:p-5 ${
        dropdownOpen ? 'z-50' : 'z-10'
      }`}
    >
      <div className="mb-3 flex items-center gap-2 md:mb-4">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${accentBg}`}>
          {badge}
        </span>
        <span className="text-sm font-semibold text-slate-900">{label}</span>
      </div>

      <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-1">
        <button
          type="button"
          onClick={() => onModeChange('region')}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
            mode === 'region' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Region
        </button>
        <button
          type="button"
          onClick={() => onModeChange('airport')}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
            mode === 'airport' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Flughafen
        </button>
      </div>

      {mode === 'region' ? (
        <select
          value={regionId}
          onChange={(e) => onRegionChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-4 sm:text-sm ${accentRing}`}
        >
          {REGION_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} ({r.airports.join(', ')})
            </option>
          ))}
        </select>
      ) : (
        <div ref={containerRef} className="relative">
          {selectedAirports.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selectedAirports.map((a) => (
                <span
                  key={a.iata}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium sm:py-1 ${accentChipBg}`}
                >
                  <span>{countryFlag(a.countryCode)}</span>
                  <span className="font-mono">{a.iata}</span>
                  <span className="opacity-70">{a.cityName}</span>
                  <button
                    type="button"
                    onClick={() => onSelectedChange(selectedAirports.filter((x) => x.iata !== a.iata))}
                    className={`-mr-1 ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-base leading-none active:bg-white/60 sm:h-4 sm:w-4 sm:text-sm ${accentText}`}
                    aria-label={`${a.iata} entfernen`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={
              airportsLoading
                ? 'Flughäfen werden geladen…'
                : maxReached
                  ? 'Maximal 8 Flughäfen ausgewählt'
                  : 'Stadt, Flughafen oder IATA…'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            disabled={airportsLoading || maxReached}
            className={`w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-base shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:opacity-50 sm:text-sm ${accentRing}`}
          />

          {dropdownOpen && filtered.length > 0 && (
            <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-2xl">
              {filtered.map((a) => (
                <li
                  key={a.iata}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleAirport(a)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-3 text-sm transition-colors active:bg-slate-100 sm:py-2.5 ${
                    selectedIatas.has(a.iata) ? 'bg-slate-50 text-slate-400' : 'text-slate-700'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span>{countryFlag(a.countryCode)}</span>
                    <span className="font-mono text-xs font-semibold text-slate-900">{a.iata}</span>
                    <span className="truncate">{a.cityName}</span>
                    <span className="hidden truncate text-xs text-slate-400 sm:inline">· {a.name}</span>
                  </span>
                  {selectedIatas.has(a.iata) && <span className={`shrink-0 ${accentText}`}>✓</span>}
                </li>
              ))}
            </ul>
          )}

          {dropdownOpen && search.length >= 1 && filtered.length === 0 && !airportsLoading && (
            <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
              Keine passenden Flughäfen
            </div>
          )}

          {selectedAirports.length === 0 && !airportsLoading && (
            <p className="mt-2 text-xs text-slate-500">Mindestens einen Flughafen auswählen</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage(): React.ReactElement {
  const [modeA, setModeA] = useState<PickerMode>('region');
  const [modeB, setModeB] = useState<PickerMode>('region');
  const [regionA, setRegionA] = useState('vienna');
  const [regionB, setRegionB] = useState('berlin');
  const [airportsA, setAirportsA] = useState<Airport[]>([]);
  const [airportsB, setAirportsB] = useState<Airport[]>([]);

  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const [airportsLoading, setAirportsLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  });
  const [flexibleDates, setFlexibleDates] = useState(true);
  const [exactOutboundDate, setExactOutboundDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [exactInboundDate, setExactInboundDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 18);
    return d.toISOString().slice(0, 10);
  });
  const [durMin, setDurMin] = useState(3);
  const [durMax, setDurMax] = useState(5);
  const [maxPrice, setMaxPrice] = useState(150);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/airports')
      .then((r) => r.json())
      .then((d: { airports: Airport[] }) => {
        setAllAirports(d.airports);
        setAirportsLoading(false);
      })
      .catch(() => setAirportsLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    const aIatas = getIatas(modeA, regionA, airportsA);
    const bIatas = getIatas(modeB, regionB, airportsB);

    if (aIatas.length === 0 || bIatas.length === 0) {
      setError('Bitte für beide Seiten mindestens einen Flughafen auswählen.');
      setLoading(false);
      return;
    }

    let searchDateFrom = dateFrom;
    let searchDateTo = dateTo;
    let searchDurMin = durMin;
    let searchDurMax = durMax;

    if (flexibleDates) {
      if (dateFrom > dateTo) {
        setError('Frühester Hinflug muss vor oder am spätesten Hinflugdatum liegen.');
        setLoading(false);
        return;
      }
      if (durMin > durMax) {
        setError('Mindest-Reisedauer muss kleiner oder gleich der maximalen Reisedauer sein.');
        setLoading(false);
        return;
      }
    } else {
      if (exactOutboundDate >= exactInboundDate) {
        setError('Das genaue Rückflugdatum muss nach dem genauen Hinflugdatum liegen.');
        setLoading(false);
        return;
      }
      const out = new Date(`${exactOutboundDate}T00:00:00Z`);
      const back = new Date(`${exactInboundDate}T00:00:00Z`);
      const nights = Math.round((back.getTime() - out.getTime()) / (24 * 60 * 60 * 1000));
      if (!Number.isFinite(nights) || nights < 1) {
        setError('Bitte ein gültiges genaues Hin- und Rückflugdatum wählen.');
        setLoading(false);
        return;
      }
      if (nights > 30) {
        setError('Die genaue Reisedauer darf maximal 30 Nächte betragen.');
        setLoading(false);
        return;
      }
      searchDateFrom = exactOutboundDate;
      searchDateTo = exactOutboundDate;
      searchDurMin = nights;
      searchDurMax = nights;
    }

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          regionAAirports: aIatas,
          regionBAirports: bIatas,
          dateFrom: searchDateFrom,
          dateTo: searchDateTo,
          tripDurationDaysMin: searchDurMin,
          tripDurationDaysMax: searchDurMax,
          maxPricePerPersonEur: maxPrice,
          weatherWeight: 0,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as SearchResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-safe pt-8 sm:px-6 md:py-20">
      <header className="mb-8 text-center md:mb-16">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/60 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm backdrop-blur-md md:mb-4">
          <SparkleIcon className="h-3 w-3" />
          Powered by Ryanair
        </div>
        <h1 className="bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-800 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-7xl">
          CheapTripFinder
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base md:mt-4 md:text-lg">
          Findet das perfekte gemeinsame Reiseziel für zwei Freunde aus unterschiedlichen Städten.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-soft backdrop-blur-xl sm:rounded-3xl sm:p-6 md:mb-10 md:p-8"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AirportPicker
            label="Abflug"
            badge="A"
            accent="indigo"
            allAirports={allAirports}
            airportsLoading={airportsLoading}
            mode={modeA}
            onModeChange={setModeA}
            regionId={regionA}
            onRegionChange={setRegionA}
            selectedAirports={airportsA}
            onSelectedChange={setAirportsA}
          />

          <AirportPicker
            label="Abflug"
            badge="B"
            accent="fuchsia"
            allAirports={allAirports}
            airportsLoading={airportsLoading}
            mode={modeB}
            onModeChange={setModeB}
            regionId={regionB}
            onRegionChange={setRegionB}
            selectedAirports={airportsB}
            onSelectedChange={setAirportsB}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-soft backdrop-blur-md sm:p-5 md:mt-6">
          <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => setFlexibleDates(true)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
                flexibleDates ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Flexibel
            </button>
            <button
              type="button"
              onClick={() => setFlexibleDates(false)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all active:scale-95 ${
                !flexibleDates ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Genaue Daten
            </button>
          </div>

          {flexibleDates ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Frühester Hinflug">
                <DateInput value={dateFrom} onChange={setDateFrom} />
              </Field>
              <Field label="Spätester Hinflug">
                <DateInput value={dateTo} onChange={setDateTo} />
              </Field>
              <Field label={`Reisedauer · ${durMin}–${durMax} Nächte`}>
                <div className="flex items-center gap-2">
                  <NumberInput value={durMin} onChange={setDurMin} min={1} max={30} />
                  <span className="text-slate-400">–</span>
                  <NumberInput value={durMax} onChange={setDurMax} min={1} max={30} />
                </div>
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Hinflug">
                <DateInput value={exactOutboundDate} onChange={setExactOutboundDate} />
              </Field>
              <Field label="Rückflug">
                <DateInput value={exactInboundDate} onChange={setExactInboundDate} />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-soft backdrop-blur-md sm:p-5 md:mt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900">Max. pro Person</span>
            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-2xl font-bold tabular-nums text-transparent">
              {formatEur(maxPrice)}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>50 €</span>
            <span>500 €</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-4 text-sm font-semibold tracking-wide text-white shadow-glow transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:mt-6 md:hover:from-indigo-700 md:hover:to-fuchsia-700 md:hover:shadow-xl"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner /> Suche läuft…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <SparkleIcon className="h-4 w-4" />
              Reiseziele finden
            </span>
          )}
        </button>
      </form>

      {error && (
        <div className="mb-6 animate-fade-in rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900 backdrop-blur-md">
          {error}
        </div>
      )}

      {loading && <ResultsSkeleton />}

      {data && !loading && <Results data={data} />}
    </main>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }): React.ReactElement {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-base text-slate-900 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/40 sm:py-2.5 sm:text-sm"
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}): React.ReactElement {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-base tabular-nums text-slate-900 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/40 sm:py-2.5 sm:text-sm"
    />
  );
}

function Spinner(): React.ReactElement {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function Results({ data }: { data: SearchResponse }): React.ReactElement {
  if (data.results.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white/60 p-8 text-center text-slate-700 shadow-soft backdrop-blur-md">
        <p className="text-lg font-medium">Kein passendes Reiseziel gefunden</p>
        <p className="mt-2 text-sm text-slate-500">
          Erweitere den Datumsbereich oder erhöhe das Budget, um mehr Optionen zu sehen.
        </p>
      </div>
    );
  }
  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {data.counts.commonDestinations}{' '}
          <span className="font-normal text-slate-500">gemeinsame Reiseziele · Top {data.results.length}</span>
        </h2>
      </div>
      <ol className="space-y-4">
        {data.results.map((r, idx) => (
          <ResultCard key={r.destination} result={r} rank={idx + 1} />
        ))}
      </ol>
    </div>
  );
}

function ResultCard({ result, rank }: { result: RankedDestination; rank: number }): React.ReactElement {
  const priceA = result.fromRegionA.bestFare.priceEur;
  const priceB = result.fromRegionB.bestFare.priceEur;
  return (
    <li className="group overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-soft backdrop-blur-md transition-all md:hover:border-slate-300 md:hover:shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-gradient-to-br from-white/80 to-slate-50/80 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white sm:h-9 sm:w-9">
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              <span className="mr-1.5 sm:mr-2">{countryFlag(result.destinationCountryCode)}</span>
              {result.destinationCityName}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
              <span className="font-mono">{result.destination}</span> · {result.destinationCountryCode}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Gesamt für 2</div>
          <div className="text-base font-semibold tabular-nums text-slate-900 sm:text-lg">{formatEur(result.combinedPriceEur)}</div>
        </div>
      </div>

      {/* Two-person split */}
      <div className="grid grid-cols-1 divide-y divide-slate-200/70 md:grid-cols-2 md:divide-x md:divide-y-0">
        <PersonPanel
          letter="A"
          accent="indigo"
          fare={result.fromRegionA}
          destination={result.destination}
          price={priceA}
        />
        <PersonPanel
          letter="B"
          accent="fuchsia"
          fare={result.fromRegionB}
          destination={result.destination}
          price={priceB}
        />
      </div>
    </li>
  );
}

function PersonPanel({
  letter,
  accent,
  fare,
  destination,
  price,
}: {
  letter: 'A' | 'B';
  accent: 'indigo' | 'fuchsia';
  fare: RegionBestFare;
  destination: string;
  price: number;
}): React.ReactElement {
  const accentDot = accent === 'indigo' ? 'bg-indigo-500' : 'bg-fuchsia-500';
  const accentText = accent === 'indigo' ? 'text-indigo-600' : 'text-fuchsia-600';
  const accentHover = accent === 'indigo' ? 'hover:text-indigo-700' : 'hover:text-fuchsia-700';

  return (
    <div className="p-4 sm:p-5 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${accentDot}`}>
            {letter}
          </span>
          <div className="min-w-0">
            <div className="font-mono text-sm font-semibold text-slate-900">{fare.bestFare.origin}</div>
            <div className="truncate text-[11px] text-slate-500">{fare.groundMinutesFromCenter} Min. vom Zentrum</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">pro Person</div>
          <div className={`text-xl font-bold tabular-nums ${accentText}`}>{formatEur(price)}</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <FlightRow
          origin={fare.bestFare.origin}
          destination={destination}
          time={fare.bestFare.outboundDepartureAt}
          price={fare.bestFare.outboundPriceEur}
          url={fare.bestFare.outboundBookingUrl}
          accentHover={accentHover}
          direction="out"
        />
        <FlightRow
          origin={destination}
          destination={fare.bestFare.origin}
          time={fare.bestFare.inboundDepartureAt}
          price={fare.bestFare.inboundPriceEur}
          url={fare.bestFare.inboundBookingUrl}
          accentHover={accentHover}
          direction="in"
        />
      </div>
    </div>
  );
}

function FlightRow({
  origin,
  destination,
  time,
  price,
  url,
  accentHover,
  direction,
}: {
  origin: string;
  destination: string;
  time: string;
  price: number;
  url: string;
  accentHover: string;
  direction: 'out' | 'in';
}): React.ReactElement {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group/row flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5 text-xs transition-all hover:border-slate-300 hover:bg-white ${accentHover}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`shrink-0 text-slate-400 ${direction === 'in' ? 'rotate-180' : ''}`}>
          <PlaneIcon className="h-3.5 w-3.5" />
        </span>
        <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
          <span>{origin}</span>
          <ArrowIcon className="h-2.5 w-2.5 text-slate-400" />
          <span>{destination}</span>
        </span>
        <span className="truncate text-slate-500">{formatDeparture(time)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold tabular-nums text-slate-900">{formatEur(price)}</span>
        <span className="text-slate-300 transition-transform group-hover/row:translate-x-0.5">
          <ArrowIcon className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}

function ResultsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/40 shadow-soft backdrop-blur-md">
          <div className="border-b border-slate-200/70 px-6 py-4">
            <div className="shimmer-bg h-6 w-48 animate-shimmer rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <div className="shimmer-bg h-24 animate-shimmer rounded-xl" />
            <div className="shimmer-bg h-24 animate-shimmer rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
