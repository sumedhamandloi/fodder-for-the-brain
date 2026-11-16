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
}

export interface Manifest {
  sprites: Record<string, SpriteMeta>;
  ui: Record<string, string>;
  status: string;
}

export const ASSET_ROOT = 'assets/';
