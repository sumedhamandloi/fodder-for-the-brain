import { supabase } from '../../services/supabase';
import { useSession } from '../../state/session';

export interface PlacedDecor {
  id: string;
  key: string;
  x: number; // bottom-centre, art px
  y: number;
}

/** The housewarming gift every garden starts with. Nothing is bought, nothing runs out. */
export const STARTER_INVENTORY: Record<string, number> = {
  bench: 2,
  lantern: 2,
  pot_pink: 2,
  pot_yellow: 2,
  pot_white: 2,
  bush_pink: 2,
  bush_blue: 1,
  bush_white: 1,
  tree_cherry_s: 1,
  rock_moss: 1,
  mushroom_red: 2,
  barrel: 1,
  crate: 1,
  signpost: 1,
};

export const DECOR_LABEL: Record<string, string> = {
  bench: 'Bench', lantern: 'Lantern', pot_pink: 'Pink flower pot', pot_yellow: 'Yellow flower pot',
  pot_white: 'White flower pot', bush_pink: 'Blossom bush', bush_blue: 'Hydrangea bush', bush_white: 'Snowball bush',
  tree_cherry_s: 'Little cherry tree', rock_moss: 'Mossy rock', mushroom_red: 'Toadstools', barrel: 'Rain barrel',
  crate: 'Crate', signpost: 'Signpost',
};

/** Tile footprint each item occupies on the lawn grid (width, height in tiles). */
export const FOOTPRINT: Record<string, [number, number]> = {
  bench: [2, 1], tree_cherry_s: [2, 1], bush_pink: [2, 1], bush_blue: [2, 1], bush_white: [2, 1], rock_moss: [2, 1],
};

export function available(placed: PlacedDecor[]) {
  const left: Record<string, number> = { ...STARTER_INVENTORY };
  for (const p of placed) if (left[p.key] !== undefined) left[p.key] -= 1;
  return left;
}

// ---------------------------------------------------------------- persistence
const LS_KEY = 'fodder.garden.v1';

export async function loadGarden(): Promise<PlacedDecor[]> {
  const s = useSession.getState();
  if (s.repo.kind === 'account' && supabase) {
    const { data, error } = await supabase.from('garden_objects').select('id,object_key,x,y');
    if (!error) return (data ?? []).map((r) => ({ id: r.id, key: r.object_key, x: r.x, y: r.y }));
    // table missing (migration not yet run): fall back to this device
  }
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export async function saveGarden(next: PlacedDecor[], prev: PlacedDecor[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  const s = useSession.getState();
  if (s.repo.kind !== 'account' || !supabase) return;
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const removed = prev.filter((p) => !next.some((n) => n.id === p.id)).map((p) => p.id);
  if (removed.length) await supabase.from('garden_objects').delete().in('id', removed);
  if (next.length)
    await supabase.from('garden_objects').upsert(next.map((n) => ({ id: n.id, user_id: userId, object_key: n.key, x: n.x, y: n.y })));
}
