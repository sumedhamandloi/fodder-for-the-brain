import type { AvatarConfig, AvatarMeta } from './types';

const ROOT = 'assets/avatar/';
let metaP: Promise<AvatarMeta> | null = null;
const atlasP = new Map<string, Promise<HTMLImageElement>>();

export function loadAvatarMeta(): Promise<AvatarMeta> {
  return (metaP ??= fetch(ROOT + 'avatar.json').then((r) => r.json()));
}

function loadAtlas(cat: string) {
  let p = atlasP.get(cat);
  if (!p) {
    p = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = ROOT + cat + '.png';
    });
    atlasP.set(cat, p);
  }
  return p;
}

/** Which variant of each layer category a config uses. */
function variantFor(cat: string, c: AvatarConfig): string {
  switch (cat) {
    case 'skin': return c.skin;
    // deep skin tones use an eye variant with a lighter glint so the eyes stay readable
    case 'eyes': return `${c.eyes}.${c.skin === 'umber' || c.skin === 'ebony' ? 'd' : 'l'}`;
    case 'hair_back':
    case 'hair_front': return `${c.hairStyle}.${c.hairColor}`;
    case 'outfit': return `${c.outfit}.${c.outfitColor}`;
    case 'shoes': return c.shoes;
    case 'hat': return c.hat;
    case 'acc': return c.accessory;
    default: return c.backpack; // pack_back / pack_front
  }
}

/** Compose the 18-frame avatar sheet (144x96) and add the 1px outline per frame. */
export async function composeAvatar(config: AvatarConfig): Promise<HTMLCanvasElement> {
  const meta = await loadAvatarMeta();
  const [fw, fh] = meta.frame;
  const W = fw * meta.cols, H = fh * meta.rows;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const atlases = await Promise.all(meta.order.map(loadAtlas));
  meta.order.forEach((cat, i) => {
    const idx = Math.max(0, meta.categories[cat].indexOf(variantFor(cat, config)));
    ctx.drawImage(atlases[i], 0, idx * H, W, H, 0, 0, W, H);
  });
  // outline: transparent pixels touching an opaque pixel in the same frame
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const o = meta.outline;
  const [or, og, ob] = [1, 3, 5].map((k) => parseInt(o.slice(k, k + 2), 16));
  const opaque = (x: number, y: number) => d[(y * W + x) * 4 + 3] > 0;
  const mark: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (opaque(x, y)) continue;
      const fx = x % fw, fy = y % fh;
      if ((fx > 0 && opaque(x - 1, y)) || (fx < fw - 1 && opaque(x + 1, y)) ||
          (fy > 0 && opaque(x, y - 1)) || (fy < fh - 1 && opaque(x, y + 1))) mark.push(y * W + x);
    }
  }
  for (const i of mark) {
    d[i * 4] = or; d[i * 4 + 1] = og; d[i * 4 + 2] = ob; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
