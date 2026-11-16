import { create } from 'zustand';

export type Phase = 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'evening' | 'night';
export const PHASES: Phase[] = ['dawn', 'morning', 'afternoon', 'sunset', 'evening', 'night'];

export function phaseForHour(h: number): Phase {
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'sunset';
  if (h >= 19 && h < 21) return 'evening';
  return 'night';
}

export type LibraryView = { kind: 'shelf'; id: string } | { kind: 'read'; id: string; from?: LibraryView } | { kind: 'saved' };

export interface Hotspot {
  id: string;
  label: string;
}

interface WorldState {
  ready: boolean;
  hotspots: Hotspot[];
  nearby: Hotspot | null;
  openPlace: string | null;
  location: 'garden' | 'library';
  reading: LibraryView | null;
  atPond: boolean;
  panel: 'places' | 'world' | 'leave' | 'avatar' | null;
  timeMode: 'auto' | 'manual';
  manualPhase: Phase;
  autoPhase: Phase;
  reducedMotion: boolean;
  set: (p: Partial<WorldState>) => void;
}

const prefersReduced =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function loadPrefs(): Partial<WorldState> {
  try {
    const raw = localStorage.getItem('fodder.prefs');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const useWorld = create<WorldState>((set) => ({
  ready: false,
  hotspots: [],
  nearby: null,
  openPlace: null,
  location: 'garden',
  reading: null,
  atPond: false,
  panel: null,
  timeMode: 'auto',
  manualPhase: 'afternoon',
  autoPhase: phaseForHour(new Date().getHours()),
  reducedMotion: !!prefersReduced,
  ...loadPrefs(),
  set: (p) => set(p),
}));

useWorld.subscribe((s) => {
  try {
    localStorage.setItem(
      'fodder.prefs',
      JSON.stringify({ timeMode: s.timeMode, manualPhase: s.manualPhase, reducedMotion: s.reducedMotion }),
    );
  } catch {
    /* storage unavailable: preferences simply aren't remembered */
  }
});

export const currentPhase = (s: WorldState): Phase => (s.timeMode === 'manual' ? s.manualPhase : s.autoPhase);

// keep the automatic phase in step with the local clock
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    const p = phaseForHour(new Date().getHours());
    if (p !== useWorld.getState().autoPhase) useWorld.getState().set({ autoPhase: p });
  }, 30_000);
}


