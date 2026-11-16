export interface AvatarConfig {
  skin: string;
  hairStyle: string;
  hairColor: string;
  eyes: string;
  outfit: string;
  outfitColor: string;
  shoes: string;
  hat: string;
  accessory: string;
  backpack: string;
}

export interface AvatarMeta {
  frame: [number, number];
  cols: number;
  rows: number;
  order: string[];
  categories: Record<string, string[]>;
  outline: string;
  options: Record<keyof AvatarConfig, string[]> & {
    default: AvatarConfig;
    swatch: Partial<Record<keyof AvatarConfig, Record<string, string>>>;
  };
}
