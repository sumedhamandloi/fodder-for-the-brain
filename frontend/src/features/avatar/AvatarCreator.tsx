import { useEffect, useRef, useState } from 'react';
import { composeAvatar, loadAvatarMeta } from './compose';
import type { AvatarConfig, AvatarMeta } from './types';
import { PixelButton } from '../../ui/Pixel';
import s from './AvatarCreator.module.css';

const LABEL: Record<keyof AvatarConfig, string> = {
  skin: 'Skin', hairStyle: 'Hairstyle', hairColor: 'Hair colour', eyes: 'Eyes', outfit: 'Outfit',
  outfitColor: 'Outfit colour', shoes: 'Shoes', hat: 'Hat', accessory: 'Accessory', backpack: 'Bag',
};
const ROWS: (keyof AvatarConfig)[] = [
  'skin', 'hairStyle', 'hairColor', 'eyes', 'outfit', 'outfitColor', 'shoes', 'hat', 'accessory', 'backpack',
];
const VIEW_ROW = { down: 0, side: 2, up: 1 } as const;
type View = keyof typeof VIEW_ROW;
const nice = (v: string) => (v === 'none' ? 'None' : v.charAt(0).toUpperCase() + v.slice(1));

export function AvatarPreview({ config, scale = 6, view = 'down', walking = true }: {
  config: AvatarConfig; scale?: number; view?: View; walking?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let live = true;
    composeAvatar(config).then((c) => live && setSheet(c));
    return () => {
      live = false;
    };
  }, [config]);
  useEffect(() => {
    if (!sheet || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let f = 0;
    const draw = () => {
      const col = walking && !reduce ? 2 + (f % 4) : 0;
      ctx.clearRect(0, 0, 24, 32);
      ctx.drawImage(sheet, col * 24, VIEW_ROW[view] * 32, 24, 32, 0, 0, 24, 32);
      f++;
    };
    draw();
    const t = window.setInterval(draw, 160);
    return () => window.clearInterval(t);
  }, [sheet, view, walking]);
  return (
    <canvas
      ref={ref}
      width={24}
      height={32}
      className={s.preview}
      style={{ width: 24 * scale, height: 32 * scale }}
      role="img"
      aria-label="Your avatar"
    />
  );
}

export function AvatarCreator({ value, onChange }: { value: AvatarConfig; onChange: (c: AvatarConfig) => void }) {
  const [meta, setMeta] = useState<AvatarMeta | null>(null);
  const [view, setView] = useState<View>('down');
  useEffect(() => {
    loadAvatarMeta().then(setMeta);
  }, []);
  if (!meta) return <p>Unpacking the wardrobe…</p>;

  const step = (k: keyof AvatarConfig, d: number) => {
    const opts = meta.options[k];
    const i = opts.indexOf(value[k]);
    onChange({ ...value, [k]: opts[(i + d + opts.length) % opts.length] });
  };
  const surprise = () => {
    const c = { ...value };
    for (const k of ROWS) {
      const o = meta.options[k];
      c[k] = o[Math.floor(Math.random() * o.length)];
    }
    onChange(c);
  };
  const views: View[] = ['down', 'side', 'up'];

  return (
    <div className={s.layout}>
      <div className={s.stage}>
        <div className={s.pedestal}>
          <AvatarPreview config={value} view={view} />
        </div>
        <div className={s.turn}>
          <PixelButton variant="quiet" aria-label="Turn left" onClick={() => setView(views[(views.indexOf(view) + 2) % 3])}>◀</PixelButton>
          <span>Turn</span>
          <PixelButton variant="quiet" aria-label="Turn right" onClick={() => setView(views[(views.indexOf(view) + 1) % 3])}>▶</PixelButton>
        </div>
        <PixelButton variant="quiet" onClick={surprise}>Surprise me</PixelButton>
      </div>
      <div className={s.options}>
        {ROWS.map((k) => {
          const sw = meta.options.swatch[k];
          return (
            <div key={k} className={s.row}>
              <span className={s.label}>{LABEL[k]}</span>
              {sw ? (
                <div className={s.swatches} role="radiogroup" aria-label={LABEL[k]}>
                  {meta.options[k].map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={value[k] === v}
                      aria-label={nice(v)}
                      title={nice(v)}
                      className={s.swatch}
                      style={{ background: sw[v] }}
                      onClick={() => onChange({ ...value, [k]: v })}
                    />
                  ))}
                </div>
              ) : (
                <div className={s.stepper}>
                  <PixelButton variant="quiet" aria-label={`Previous ${LABEL[k]}`} onClick={() => step(k, -1)}>◀</PixelButton>
                  <span className={s.value} aria-live="polite">{nice(value[k])}</span>
                  <PixelButton variant="quiet" aria-label={`Next ${LABEL[k]}`} onClick={() => step(k, 1)}>▶</PixelButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
