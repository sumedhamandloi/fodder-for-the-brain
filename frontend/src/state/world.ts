import { create } from 'zustand';

export type Phase = 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'evening' | 'night';
export const PHASES: Phase[] = ['dawn', 'morning', 'afternoon', 'sunset', 'evening', 'night'];

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export type Weather = 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain' | 'snow' | 'fog' | 'storm';
export const WEATHERS: Weather[] = ['clear', 'cloudy', 'light_rain', 'heavy_rain', 'snow', 'fog', 'storm'];

export function phaseForHour(h: number): Phase {
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'sunset';
  if (h >= 19 && h < 21) return 'evening';
  return 'night';
}

/** Season from the calendar month. Southern hemisphere is flipped (only known if you shared a rough location). */
export function seasonForDate(d: Date, hemisphere: 'N' | 'S' = 'N'): Season {
  const m = d.getMonth(); // 0 = Jan
  const north: Season = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  if (hemisphere === 'N') return north;
  return ({ spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' } as const)[north];
}

export type LibraryView =
  | { kind: 'shelf'; id: string }
  | { kind: 'read'; id: string; from?: LibraryView }
  | { kind: 'saved' }
  | { kind: 'desk' }; // today's read + picks for you

export interface Hotspot {
  id: string;
  label: string;
}

interface WorldState {
  ready: boolean;
  hotspots: Hotspot[];
  nearby: Hotspot | null;
  openPlace: string | null;
  location: 'garden' | 'library' | 'home' | 'cottage' | 'glasshouse';
  spaceTab: string | null;
  decorating: { item: string | null } | null;
  toast: string | null;
  homeDecor: { id: string; key: string; x: number; y: number }[];
  reading: LibraryView | null;
  atPond: boolean;
  panel: 'places' | 'world' | 'leave' | 'avatar' | 'pet' | 'map' | 'peek' | null;
  social: boolean; // social mode shows the neighbours; private mode is just you (and your pet)
  walkingPet: boolean;
  farm: { plot: number | null } | null;
  dialogue: { npc: string } | null;
  space: 'glasshouse' | 'playground' | 'curiosity' | null;
  timeMode: 'auto' | 'manual';
  manualPhase: Phase;
  autoPhase: Phase;
  seasonMode: 'auto' | 'manual';
  manualSeason: Season;
  hemisphere: 'N' | 'S';
  weatherMode: 'auto' | 'random' | 'manual';
  manualWeather: Weather;
  localWeather: Weather | null; // from Open-Meteo, only after you allowed it
  randomWeather: Weather;
  reducedMotion: boolean;
  sound: boolean;
  learning: boolean; // "Learn what I enjoy": the person can turn the learning engine off at any time
  set: (p: Partial<WorldState>) => void;
}

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const PREF_KEYS = ['timeMode', 'manualPhase', 'reducedMotion', 'seasonMode', 'manualSeason', 'hemisphere', 'weatherMode', 'manualWeather', 'sound', 'learning', 'social'] as const;

function loadPrefs(): Partial<WorldState> {
  try {
    const raw = localStorage.getItem('fodder.prefs');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const pickRandomWeather = (): Weather => {
  // gentle weather far more often than dramatic weather
  const bag: Weather[] = ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'light_rain', 'light_rain', 'fog', 'heavy_rain', 'storm'];
  return bag[Math.floor(Math.random() * bag.length)];
};

export const useWorld = create<WorldState>((set) => ({
  ready: false,
  hotspots: [],
  nearby: null,
  openPlace: null,
  location: 'garden',
  reading: null,
  atPond: false,
  decorating: null,
  toast: null,
  homeDecor: [],
  walkingPet: false,
  farm: null,
  dialogue: null,
  space: null,
  spaceTab: null,
  panel: null,
  timeMode: 'auto',
  manualPhase: 'afternoon',
  autoPhase: phaseForHour(new Date().getHours()),
  seasonMode: 'auto',
  manualSeason: 'spring',
  hemisphere: 'N',
  weatherMode: 'manual',
  manualWeather: 'clear',
  localWeather: null,
  randomWeather: pickRandomWeather(),
  reducedMotion: !!prefersReduced,
  sound: false,
  learning: true,
  social: true,
  ...loadPrefs(),
  set: (p) => set(p),
}));

useWorld.subscribe((s) => {
  try {
    localStorage.setItem('fodder.prefs', JSON.stringify(Object.fromEntries(PREF_KEYS.map((k) => [k, s[k]]))));
  } catch {
    /* storage unavailable: preferences simply aren't remembered */
  }
});

/** True while any overlay has the player's attention (the avatar stays still). */
export const isBusy = (s: WorldState) =>
  !!(s.panel || s.openPlace || s.reading || s.atPond || s.decorating || s.farm || s.dialogue || s.space);

export const currentPhase =(s: WorldState): Phase => (s.timeMode === 'manual' ? s.manualPhase : s.autoPhase);
export const currentSeason = (s: WorldState): Season =>
  s.seasonMode === 'manual' ? s.manualSeason : seasonForDate(new Date(), s.hemisphere);
export const currentWeather = (s: WorldState): Weather =>
  s.weatherMode === 'manual' ? s.manualWeather : s.weatherMode === 'random' ? s.randomWeather : s.localWeather ?? 'clear';

if (typeof window !== 'undefined') {
  // keep the automatic phase in step with the local clock
  window.setInterval(() => {
    const p = phaseForHour(new Date().getHours());
    if (p !== useWorld.getState().autoPhase) useWorld.getState().set({ autoPhase: p });
  }, 30_000);
  // "surprise me" weather drifts every 25 minutes or so
  window.setInterval(() => {
    if (useWorld.getState().weatherMode === 'random') useWorld.getState().set({ randomWeather: pickRandomWeather() });
  }, 25 * 60_000);
}
