export interface SpriteMeta {
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  body?: [number, number, number, number];
  bodies?: [number, number, number, number][];
  shadow?: [number, number];
  glow?: [number, number];
  anim?: number;
  flat?: boolean;
  cols?: number;
  anchor?: [number, number];
  seasonal?: boolean;
}

/** The texture key to use for a sprite in a season (spring is the base art). */
export function seasonKey(key: string, season: string, manifest: Manifest) {
  return season !== 'spring' && manifest.sprites[key]?.seasonal ? `${key}__${season}` : key;
}
export const tilesKey = (season: string) => (season === 'spring' ? 'tiles' : `tiles__${season}`);

export interface Manifest {
  sprites: Record<string, SpriteMeta>;
  ui: Record<string, string>;
  status: string;
}

export const ASSET_ROOT = 'assets/';
