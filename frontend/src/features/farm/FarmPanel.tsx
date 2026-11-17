import { useEffect, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { bus } from '../../game/bus';
import { CROP_INFO, CROPS, Crop, harvest, isWet, plant, stageOf, STAGE_LABEL, useFarm, water, waterAll } from './farm';
import s from './Farm.module.css';

const changed = () => bus.emit('farm:changed', {});

function CropIcon({ crop, stage }: { crop: Crop; stage: number }) {
  return <span className={s.icon} style={{ backgroundImage: `url('/assets/crop_${crop}.png')`, backgroundPositionX: `${-stage * 32}px` }} />;
}

export function FarmPanel() {
  const farm = useWorld((st) => st.farm);
  const { plots, basket } = useFarm();
  const [, tick] = useState(0);
  const [choosing, setChoosing] = useState<number | null>(null);
  // re-read stages gently while the panel is open (no visible countdown)
  useEffect(() => {
    if (!farm) return;
    const t = window.setInterval(() => tick((n) => n + 1), 20_000);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useWorld.getState().set({ farm: null });
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [farm]);
  useEffect(() => setChoosing(farm?.plot ?? null), [farm]);
  if (!farm) return null;
  const close = () => useWorld.getState().set({ farm: null });
  const act = async (fn: () => unknown) => {
    await fn();
    changed();
  };
  const order = farm.plot === null ? plots.map((_, i) => i) : [farm.plot, ...plots.map((_, i) => i).filter((i) => i !== farm.plot)];
  const hasBasket = Object.values(basket).some((n) => (n ?? 0) > 0);

  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && close()}>
      <PixelPanel className={s.panel} title="Garden beds" role="dialog" aria-modal="true" aria-label="Garden beds">
        <p className={s.lede}>Plant whatever you like. Everything grows in its own time, a little faster with water, and waits patiently once it’s ready.</p>
        <div className={s.row}>
          <PixelButton variant="quiet" onClick={() => act(waterAll)} disabled={!plots.some((p) => p.crop)}>Water every bed</PixelButton>
        </div>
        <ul className={s.plots}>
          {order.map((i) => {
            const p = plots[i];
            const st = stageOf(p);
            return (
              <li key={i} className={`${s.plot} ${farm.plot === i ? s.focus : ''}`}>
                <span className={s.num}>Bed {i + 1}</span>
                {p.crop ? (
                  <>
                    <CropIcon crop={p.crop} stage={st} />
                    <div className={s.info}>
                      <strong>{CROP_INFO[p.crop].label}</strong>
                      <span>{STAGE_LABEL[st]}{isWet(p) && st < 3 ? ' · freshly watered' : ''}</span>
                    </div>
                    <div className={s.actions}>
                      {st < 3 && (
                        <PixelButton variant="quiet" onClick={() => act(() => water(i))} disabled={isWet(p)}>
                          {isWet(p) ? 'Watered' : 'Water'}
                        </PixelButton>
                      )}
                      {st === 3 && <PixelButton onClick={() => act(() => harvest(i))}>Harvest</PixelButton>}
                    </div>
                  </>
                ) : choosing === i ? (
                  <div className={s.seeds} role="group" aria-label={`Seeds for bed ${i + 1}`}>
                    {CROPS.map((c) => (
                      <button key={c} type="button" className={s.seed} onClick={() => act(() => plant(i, c)).then(() => setChoosing(null))}>
                        <CropIcon crop={c} stage={3} />
                        {CROP_INFO[c].label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <span className={s.icon} />
                    <div className={s.info}><span>Resting soil, ready when you are</span></div>
                    <div className={s.actions}>
                      <PixelButton variant="quiet" onClick={() => setChoosing(i)}>Plant something</PixelButton>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <p className={s.label}>Your basket</p>
        {hasBasket ? (
          <ul className={s.basket}>
            {CROPS.filter((c) => (basket[c] ?? 0) > 0).map((c) => (
              <li key={c}>
                <CropIcon crop={c} stage={3} /> {basket[c]} {CROP_INFO[c].plural}
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>Empty for now. Whatever you harvest will wait for you here.</p>
        )}
        <PixelButton onClick={close}>Back to the garden</PixelButton>
      </PixelPanel>
    </div>
  );
}
