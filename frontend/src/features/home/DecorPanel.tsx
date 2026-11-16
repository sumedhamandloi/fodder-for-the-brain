import { useEffect, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { available, DECOR_LABEL, STARTER_INVENTORY } from './decor';
import s from './Home.module.css';

type Meta = Record<string, { frameWidth: number; frameHeight: number; frames: number }>;
let metaP: Promise<Meta> | null = null;
const loadMeta = () => (metaP ??= fetch('assets/manifest.json').then((r) => r.json()).then((m) => m.sprites));

function Thumb({ k, meta }: { k: string; meta: Meta | null }) {
  const m = meta?.[k];
  if (!m) return <span className={s.thumb} />;
  const scale = Math.min(2, 40 / Math.max(m.frameWidth, m.frameHeight));
  return (
    <span
      className={s.thumb}
      style={{
        width: m.frameWidth * scale,
        height: m.frameHeight * scale,
        backgroundImage: `url(assets/${k}.png)`,
        backgroundSize: `${m.frameWidth * m.frames * scale}px ${m.frameHeight * scale}px`,
      }}
    />
  );
}

/** Decorating your garden: pick something from your things, then click the lawn. Click a placed item to pick it back up. */
export function DecorPanel() {
  const deco = useWorld((st) => st.decorating);
  const placed = useWorld((st) => st.homeDecor);
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    loadMeta().then(setMeta);
  }, []);
  useEffect(() => {
    if (!deco) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useWorld.getState().set({ decorating: null });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deco]);
  if (!deco) return null;
  const left = available(placed);
  const pick = (k: string) => useWorld.getState().set({ decorating: { item: deco.item === k ? null : k } });

  return (
    <PixelPanel className={s.dock} role="region" aria-label="Decorate your garden">
      <div className={s.head}>
        <strong>Decorate</strong>
        <span className={s.hint}>
          {deco.item ? `Placing: ${DECOR_LABEL[deco.item]}. Click the lawn (or arrows + Enter).` : 'Choose something, or click a decoration on the lawn to pick it up.'}
        </span>
        <PixelButton onClick={() => useWorld.getState().set({ decorating: null })}>Done</PixelButton>
      </div>
      <ul className={s.items}>
        {Object.keys(STARTER_INVENTORY).map((k) => (
          <li key={k}>
            <button
              type="button"
              className={s.item}
              aria-pressed={deco.item === k}
              disabled={left[k] <= 0 && deco.item !== k}
              onClick={() => pick(k)}
              title={DECOR_LABEL[k]}
            >
              <Thumb k={k} meta={meta} />
              <span className={s.itemLabel}>{DECOR_LABEL[k]}</span>
              <span className={s.count}>×{left[k]}</span>
            </button>
          </li>
        ))}
      </ul>
    </PixelPanel>
  );
}

export function Toast() {
  const toast = useWorld((st) => st.toast);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => useWorld.getState().set({ toast: null }), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <PixelPanel className={s.toast} role="status">
      {toast}
    </PixelPanel>
  );
}
