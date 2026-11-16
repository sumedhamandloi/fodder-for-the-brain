import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GameHost } from './game/GameHost';
import { bus } from './game/bus';
import { PixelButton, PixelPanel, KeyCap } from './ui/Pixel';
import { PHASES, Phase, currentPhase, useWorld } from './state/world';
import { bootSession, signOut, updateAvatar, useSession } from './state/session';
import { PLACE_INFO } from './features/places/places';
import { AvatarCreator } from './features/avatar/AvatarCreator';
import { Onboarding, SignInScreen, TitleScreen, DEFAULT_AVATAR } from './features/onboarding/Screens';
import { supabase } from './services/supabase';
import { LibraryOverlay } from './features/library/LibraryOverlay';
import s from './App.module.css';

const PHASE_LABEL: Record<Phase, string> = {
  dawn: 'Dawn', morning: 'Morning', afternoon: 'Afternoon', sunset: 'Sunset', evening: 'Evening', night: 'Night',
};

export default function App() {
  const w = useWorld();
  const stage = useSession((st) => st.stage);
  const name = useSession((st) => st.profile?.displayName);
  const where = w.location === 'library' ? 'the Little Library' : name ? `${name}'s garden` : 'the garden';
  const close = () => w.set({ openPlace: null, panel: null });

  useEffect(() => {
    bootSession();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useSession.getState().stage !== 'world') return;
      if (useWorld.getState().reading) return; // the reader handles its own Escape
      if (e.key === 'Escape') close();
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (!typing && (e.key === 'm' || e.key === 'M') && !useWorld.getState().openPlace)
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

      {stage === 'title' && <TitleScreen />}
      {stage === 'signin' && <SignInScreen />}
      {stage === 'onboarding' && <Onboarding />}

      {stage === 'world' && (
        <>
          <header className={s.hudTop}>
            <PixelPanel className={s.brand}>
              Fodder for the Brain
              <small>{PHASE_LABEL[phase]} in {where}</small>
            </PixelPanel>
            <nav className={s.actions} aria-label="World menu">
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'places' })} aria-keyshortcuts="M">Places</PixelButton>
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'world' })}>Your Little World</PixelButton>
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'leave' })}>Leave quietly</PixelButton>
            </nav>
          </header>

          {w.nearby && !w.openPlace && !w.panel && !w.reading && (
            <PixelPanel className={s.prompt} role="status">
              <KeyCap>E</KeyCap> Visit {w.nearby.label}
            </PixelPanel>
          )}

          {!w.openPlace && !w.panel && !w.reading && (
            <p className={s.help}>WASD / arrows to wander Â· click to walk Â· M for places</p>
          )}

          {w.openPlace && <PlaceCard id={w.openPlace} onClose={close} />}
          {w.panel === 'places' && <PlacesMenu onClose={close} />}
          {w.panel === 'world' && <WorldPanel onClose={close} />}
          {w.panel === 'avatar' && <AvatarPanel onClose={close} />}
          {w.panel === 'leave' && <LeavePanel onClose={close} />}
          <LibraryOverlay />
        </>
      )}
    </>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
  }, []);
  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <PixelPanel ref={ref} className={wide ? s.wide : s.card} title={title} role="dialog" aria-modal="true" aria-label={title}>
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
  const sess = useSession();
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
      <p className={s.label}>You</p>
      <div className={s.row}>
        <PixelButton variant="quiet" onClick={() => w.set({ panel: 'avatar' })}>Change how you look</PixelButton>
        {sess.repo.kind === 'account' ? (
          <PixelButton variant="quiet" onClick={() => { signOut(); onClose(); }}>Sign out</PixelButton>
        ) : (
          supabase && (
            <PixelButton variant="quiet" onClick={() => { onClose(); sess.set({ stage: 'signin' }); }}>
              Sign in to keep your garden everywhere
            </PixelButton>
          )
        )}
      </div>
      <p className={s.note}>
        {sess.repo.kind === 'account' ? `Saved to your account (${sess.email}).` : 'Saved on this device.'} Seasons and weather arrive in Milestone 7.
      </p>
      <PixelButton onClick={onClose}>Done</PixelButton>
    </Modal>
  );
}

function AvatarPanel({ onClose }: { onClose: () => void }) {
  const current = useSession((st) => st.avatar) ?? DEFAULT_AVATAR;
  const [draft, setDraft] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await updateAvatar(draft).catch(() => undefined);
    onClose();
  };
  return (
    <Modal title="Change how you look" onClose={onClose} wide>
      <AvatarCreator value={draft} onChange={setDraft} />
      <div className={s.row}>
        <PixelButton variant="quiet" onClick={onClose}>Never mind</PixelButton>
        <PixelButton onClick={save} disabled={saving}>{saving ? 'Savingâ€¦' : 'Keep this look'}</PixelButton>
      </div>
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

