import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { GameHost } from './game/GameHost';
import { bus } from './game/bus';
import { PixelButton, PixelPanel, KeyCap } from './ui/Pixel';
import { PHASES, Phase, currentPhase, useWorld } from './state/world';
import { PLACE_INFO } from './features/places/places';
import s from './App.module.css';

const PHASE_LABEL: Record<Phase, string> = {
  dawn: 'Dawn', morning: 'Morning', afternoon: 'Afternoon', sunset: 'Sunset', evening: 'Evening', night: 'Night',
};

export default function App() {
  const w = useWorld();
  const close = () => w.set({ openPlace: null, panel: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if ((e.key === 'm' || e.key === 'M') && !useWorld.getState().openPlace)
        w.set({ panel: useWorld.getState().panel === 'places' ? null : 'places' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phase = currentPhase(w);

  return (
    <>
      <GameHost />

      <header className={s.hudTop}>
        <PixelPanel className={s.brand}>
          Fodder for the Brain
          <small>{PHASE_LABEL[phase]} in the garden</small>
        </PixelPanel>
        <nav className={s.actions} aria-label="World menu">
          <PixelButton variant="quiet" onClick={() => w.set({ panel: 'places' })} aria-keyshortcuts="M">Places</PixelButton>
          <PixelButton variant="quiet" onClick={() => w.set({ panel: 'world' })}>Your Little World</PixelButton>
          <PixelButton variant="quiet" onClick={() => w.set({ panel: 'leave' })}>Leave quietly</PixelButton>
        </nav>
      </header>

      {w.nearby && !w.openPlace && !w.panel && (
        <PixelPanel className={s.prompt} role="status">
          <KeyCap>E</KeyCap> Visit {w.nearby.label}
        </PixelPanel>
      )}

      {!w.openPlace && !w.panel && (
        <p className={s.help}>WASD / arrows to wander · click to walk · M for places</p>
      )}

      {w.openPlace && <PlaceCard id={w.openPlace} onClose={close} />}
      {w.panel === 'places' && <PlacesMenu onClose={close} />}
      {w.panel === 'world' && <WorldPanel onClose={close} />}
      {w.panel === 'leave' && <LeavePanel onClose={close} />}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);
  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <PixelPanel ref={ref} className={s.card} title={title} role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </PixelPanel>
    </div>
  );
}

function PlaceCard({ id, onClose }: { id: string; onClose: () => void }) {
  const label = useWorld.getState().hotspots.find((h) => h.id === id)?.label ?? id;
  const info = PLACE_INFO[id];
  return (
    <Modal title={label} onClose={onClose}>
      <p className={s.reading}>{info?.blurb}</p>
      <p className={s.note}>The door opens in {info?.milestone}. For now, the garden is yours to wander.</p>
      <div className={s.row}>
        <PixelButton onClick={onClose}>Back to the garden</PixelButton>
      </div>
    </Modal>
  );
}

function PlacesMenu({ onClose }: { onClose: () => void }) {
  const hotspots = useWorld((st) => st.hotspots);
  return (
    <Modal title="Places" onClose={onClose}>
      <ul className={s.list}>
        {hotspots.map((h) => (
          <li key={h.id}>
            <PixelButton variant="quiet" onClick={() => bus.emit('place:goto', { id: h.id })}>
              {h.label}
            </PixelButton>
          </li>
        ))}
      </ul>
      <PixelButton onClick={onClose}>Close</PixelButton>
    </Modal>
  );
}

function WorldPanel({ onClose }: { onClose: () => void }) {
  const w = useWorld();
  return (
    <Modal title="Your Little World" onClose={onClose}>
      <p className={s.label}>Time of day</p>
      <div className={s.row}>
        <PixelButton variant="quiet" aria-pressed={w.timeMode === 'auto'} onClick={() => w.set({ timeMode: 'auto' })}>
          Match my clock
        </PixelButton>
        {PHASES.map((p) => (
          <PixelButton
            key={p}
            variant="quiet"
            aria-pressed={w.timeMode === 'manual' && w.manualPhase === p}
            onClick={() => w.set({ timeMode: 'manual', manualPhase: p })}
          >
            {PHASE_LABEL[p]}
          </PixelButton>
        ))}
      </div>
      <p className={s.label}>Motion</p>
      <div className={s.row}>
        <PixelButton variant="quiet" aria-pressed={w.reducedMotion} onClick={() => w.set({ reducedMotion: !w.reducedMotion })}>
          Reduce motion
        </PixelButton>
      </div>
      <p className={s.note}>Seasons and weather arrive in Milestone 7. It is spring in the garden for now.</p>
      <PixelButton onClick={onClose}>Done</PixelButton>
    </Modal>
  );
}

function LeavePanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="See you soon" onClose={onClose}>
      <p className={s.reading}>
        Your garden will be right here, just as you left it. Nothing wilts, nothing waits on you. Close the tab whenever you like.
      </p>
      <PixelButton onClick={onClose}>Stay a little longer</PixelButton>
    </Modal>
  );
}
