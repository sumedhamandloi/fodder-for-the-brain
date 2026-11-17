import { create } from 'zustand';
import { supabase } from '../../services/supabase';
import { useSession } from '../../state/session';

export const CROPS = ['carrot', 'strawberry', 'sunflower', 'tomato', 'pumpkin', 'blueberry', 'lavender', 'tulip'] as const;
export type Crop = (typeof CROPS)[number];

/** Real-time growth to full maturity. Gentle and forgiving: crops wait forever once ready. */
export const CROP_INFO: Record<Crop, { label: string; plural: string; minutes: number; yield: number }> = {
  carrot: { label: 'Carrots', plural: 'carrots', minutes: 30, yield: 4 },
  tulip: { label: 'Tulips', plural: 'tulips', minutes: 45, yield: 4 },
  strawberry: { label: 'Strawberries', plural: 'strawberries', minutes: 60, yield: 6 },
  tomato: { label: 'Tomatoes', plural: 'tomatoes', minutes: 60, yield: 5 },
  sunflower: { label: 'Sunflowers', plural: 'sunflowers', minutes: 90, yield: 4 },
  lavender: { label: 'Lavender', plural: 'bunches of lavender', minutes: 90, yield: 4 },
  blueberry: { label: 'Blueberries', plural: 'blueberries', minutes: 120, yield: 8 },
  pumpkin: { label: 'Pumpkins', plural: 'pumpkins', minutes: 180, yield: 2 },
};

export const STAGE_LABEL = ['Freshly planted', 'Sprouting', 'Growing well', 'Ready to harvest'];

export interface Plot {
  crop: Crop | null;
  plantedAt: number | null;
  wateredAt: number | null;
}

export const PLOT_COUNT = 6;
const WATER_BOOST_MS = 6 * 3600_000; // water helps for six hours…
const WATER_BOOST = 0.5; // …growing 50% faster. It is never required.

export function effectiveGrowthMs(p: Plot, now = Date.now()) {
  if (!p.crop || !p.plantedAt) return 0;
  let ms = now - p.plantedAt;
  if (p.wateredAt) {
    const from = Math.max(p.wateredAt, p.plantedAt);
    const to = Math.min(now, p.wateredAt + WATER_BOOST_MS);
    if (to > from) ms += (to - from) * WATER_BOOST;
  }
  return ms;
}

export function stageOf(p: Plot, now = Date.now()): 0 | 1 | 2 | 3 {
  if (!p.crop) return 0;
  const frac = effectiveGrowthMs(p, now) / (CROP_INFO[p.crop].minutes * 60_000);
  return Math.min(3, Math.floor(frac * 3)) as 0 | 1 | 2 | 3;
}

export const isWet = (p: Plot, now = Date.now()) => !!p.wateredAt && now - p.wateredAt < WATER_BOOST_MS;

// ---------------------------------------------------------------- store + persistence
interface FarmState {
  plots: Plot[];
  basket: Partial<Record<Crop, number>>;
  loaded: boolean;
}
const empty = (): Plot[] => Array.from({ length: PLOT_COUNT }, () => ({ crop: null, plantedAt: null, wateredAt: null }));
export const useFarm = create<FarmState>(() => ({ plots: empty(), basket: {}, loaded: false }));

const LS = 'fodder.farm.v1';
const isAccount = () => useSession.getState().repo.kind === 'account' && !!supabase;

export async function loadFarm() {
  let state: Pick<FarmState, 'plots' | 'basket'> = { plots: empty(), basket: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(LS) ?? 'null');
    if (raw) state = { plots: { ...empty(), ...raw.plots }, basket: raw.basket ?? {} };
    state.plots = Array.from({ length: PLOT_COUNT }, (_, i) => raw?.plots?.[i] ?? empty()[i]);
  } catch {
    /* fresh garden */
  }
  if (isAccount()) {
    const [p, b] = await Promise.all([
      supabase!.from('garden_plots').select('plot,crop,planted_at,watered_at'),
      supabase!.from('harvest_basket').select('crop,qty'),
    ]);
    if (!p.error && !b.error) {
      const plots = empty();
      for (const r of p.data ?? [])
        plots[r.plot] = { crop: r.crop, plantedAt: r.planted_at ? Date.parse(r.planted_at) : null, wateredAt: r.watered_at ? Date.parse(r.watered_at) : null };
      state = { plots, basket: Object.fromEntries((b.data ?? []).map((r) => [r.crop, r.qty])) };
    }
  }
  useFarm.setState({ ...state, loaded: true });
}

async function persist(changedPlot?: number) {
  const { plots, basket } = useFarm.getState();
  try {
    localStorage.setItem(LS, JSON.stringify({ plots, basket }));
  } catch {
    /* storage unavailable */
  }
  if (!isAccount()) return;
  const userId = (await supabase!.auth.getUser()).data.user?.id;
  if (changedPlot !== undefined) {
    const p = plots[changedPlot];
    await supabase!.from('garden_plots').upsert({
      user_id: userId, plot: changedPlot, crop: p.crop,
      planted_at: p.plantedAt ? new Date(p.plantedAt).toISOString() : null,
      watered_at: p.wateredAt ? new Date(p.wateredAt).toISOString() : null,
    });
  }
  await supabase!.from('harvest_basket').upsert(Object.entries(basket).map(([crop, qty]) => ({ user_id: userId, crop, qty })));
}

function setPlot(i: number, p: Plot) {
  const plots = useFarm.getState().plots.slice();
  plots[i] = p;
  useFarm.setState({ plots });
}

export function plant(i: number, crop: Crop) {
  setPlot(i, { crop, plantedAt: Date.now(), wateredAt: null });
  return persist(i);
}

export function water(i: number) {
  const p = useFarm.getState().plots[i];
  if (!p.crop) return;
  setPlot(i, { ...p, wateredAt: Date.now() });
  return persist(i);
}

export function waterAll() {
  const now = Date.now();
  useFarm.setState({ plots: useFarm.getState().plots.map((p) => (p.crop ? { ...p, wateredAt: now } : p)) });
  return Promise.all(useFarm.getState().plots.map((p, i) => (p.crop ? persist(i) : null)));
}

export function harvest(i: number) {
  const p = useFarm.getState().plots[i];
  if (!p.crop || stageOf(p) < 3) return;
  const basket = { ...useFarm.getState().basket, [p.crop]: (useFarm.getState().basket[p.crop] ?? 0) + CROP_INFO[p.crop].yield };
  useFarm.setState({ basket });
  setPlot(i, { crop: null, plantedAt: null, wateredAt: null });
  return persist(i);
}
