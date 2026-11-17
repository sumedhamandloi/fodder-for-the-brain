import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GameHost } from './game/GameHost';
import { bus } from './game/bus';
import { PixelButton, PixelPanel, KeyCap } from './ui/Pixel';
import { PHASES, Phase, SEASONS, Season, WEATHERS, Weather, currentPhase, currentSeason, isBusy, useWorld } from './state/world';
import { matchLocalWeather, refreshLocalWeatherIfChosen } from './services/weather';

const SEASON_LABEL: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
const WEATHER_LABEL: Record<Weather, string> = {
  clear: 'Clear', cloudy: 'Cloudy', light_rain: 'Light rain', heavy_rain: 'Heavy rain', snow: 'Snow', fog: 'Fog', storm: 'Gentle storm',
};
import { bootSession, signOut, updateAvatar, useSession } from './state/session';
import { PLACE_INFO } from './features/places/places';
import { AvatarCreator } from './features/avatar/AvatarCreator';
import { Onboarding, SignInScreen, TitleScreen, DEFAULT_AVATAR } from './features/onboarding/Screens';
import { supabase } from './services/supabase';
import { LibraryOverlay } from './features/library/LibraryOverlay';
import { PondOverlay } from './features/pond/PondOverlay';
import { DecorPanel, Toast } from './features/home/DecorPanel';
import { FarmPanel } from './features/farm/FarmPanel';
import { DialogueBox, SpaceOverlay } from './features/spaces/Spaces';
import { NPCS } from './features/npcs/npcs';
import { LearnedSection } from './features/learning/LearnedSection';
import { MapPanel } from './features/navigation/Nav';
import { PeekPanel } from './features/navigation/CottageView';
import s from './App.module.css';

const PHASE_LABEL: Record<Phase, string> = {
  dawn: 'Dawn', morning: 'Morning', afternoon: 'Afternoon', sunset: 'Sunset', evening: 'Evening', night: 'Night',
};

export default function App() {
  const w = useWorld();
  const stage = useSession((st) => st.stage);
  const name = useSession((st) => st.profile?.displayName);
  const where =
    w.location === 'library' ? 'the Little Library'
    : w.location === 'cottage' ? 'your cottage'
    : w.location === 'glasshouse' ? 'the Glasshouse'
    : w.location === 'home' ? (name ? `${name}'s little garden` : 'your little garden')
    : name ? `${name}'s garden` : 'the garden';
  const quiet = !isBusy(w);
  const close = () => w.set({ openPlace: null, panel: null });

  useEffect(() => {
    bootSession();
    refreshLocalWeatherIfChosen();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useSession.getState().stage !== 'world') return;
      const ws = useWorld.getState();
      if (ws.reading || ws.atPond || ws.decorating || ws.farm || ws.dialogue || ws.space) return; // these overlays handle their own Escape
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
              <small>{SEASON_LABEL[currentSeason(w)]} {PHASE_LABEL[phase].toLowerCase()} in {where}</small>
            </PixelPanel>
            <nav className={s.actions} aria-label="World menu">
              {w.location === 'home' && (
                <PixelButton variant="quiet" aria-pressed={!!w.decorating} onClick={() => w.set({ decorating: w.decorating ? null : { item: null } })}>
                  Decorate
                </PixelButton>
              )}
              <PixelButton
                variant="quiet"
                aria-pressed={!w.social}
                title={w.social ? 'Social mode: the neighbours are around' : 'Private mode: just you and your companion'}
                onClick={() => w.set({ social: !w.social, dialogue: null })}
              >
                {w.social ? 'Social' : 'Private'}
              </PixelButton>
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'map' })}>Map</PixelButton>
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'places' })} aria-keyshortcuts="M">Places</PixelButton>
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'world' })}>Your Little World</PixelButton>
              <PixelButton variant="quiet" onClick={() => w.set({ panel: 'leave' })}>Leave quietly</PixelButton>
            </nav>
          </header>

          {w.nearby && quiet && (
            <PixelPanel className={s.prompt}>
              {/* the prompt is a real button too: clicking it does exactly what pressing E does */}
              <button type="button" className={s.promptBtn} onClick={() => bus.emit('place:goto', { id: w.nearby!.id })}>
                <KeyCap>E</KeyCap> {w.nearby.id.startsWith('npc:') ? 'Talk to' : /^(back|out|sit)/i.test(w.nearby.label) ? '' : 'Visit'} {w.nearby.label}
              </button>
            </PixelPanel>
          )}

          {quiet && (
            <p className={s.help}>WASD / arrows to wander · click to walk · M for places</p>
          )}

          {w.openPlace && <PlaceCard id={w.openPlace} onClose={close} />}
          {w.panel === 'places' && <PlacesMenu onClose={close} />}
          {w.panel === 'world' && <WorldPanel onClose={close} />}
          {w.panel === 'avatar' && <AvatarPanel onClose={close} />}
          {w.panel === 'leave' && <LeavePanel onClose={close} />}
          {w.panel === 'pet' && <PetPanel onClose={close} />}
          {w.panel === 'map' && <MapPanel />}
          {w.panel === 'peek' && <PeekPanel />}
          <PondOverlay />
          <LibraryOverlay />
          <DecorPanel />
          <FarmPanel />
          <SpaceOverlay />
          <DialogueBox />
          <Toast />
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
  const location = useWorld((st) => st.location);
  const social = useWorld((st) => st.social);
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
      {location === 'garden' && social && (
        <>
          <p className={s.label}>Neighbours</p>
          <ul className={s.list}>
            {NPCS.map((n) => (
              <li key={n.id}>
                <PixelButton variant="quiet" onClick={() => bus.emit('place:goto', { id: `npc:${n.id}` })}>
                  {n.name}, {n.role}
                </PixelButton>
              </li>
            ))}
          </ul>
        </>
      )}
      <PixelButton onClick={onClose}>Close</PixelButton>
    </Modal>
  );
}

function WorldPanel({ onClose }: { onClose: () => void }) {
  const w = useWorld();
  const sess = useSession();
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherNote, setWeatherNote] = useState('');
  const askLocal = async () => {
    if (!('geolocation' in navigator)) return setWeatherNote('This browser can’t share a location, so the weather stays as you choose it.');
    setWeatherBusy(true);
    setWeatherNote('');
    try {
      const st = await matchLocalWeather();
      setWeatherNote(`Matched your sky: ${WEATHER_LABEL[st].toLowerCase()}. We only use a rough location (about 11 km) once, and never store it.`);
    } catch {
      setWeatherNote('No problem. Without a location, the weather stays as you choose it.');
    } finally {
      setWeatherBusy(false);
    }
  };
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
      <p className={s.label}>Season</p>
      <div className={s.row}>
        <PixelButton variant="quiet" aria-pressed={w.seasonMode === 'auto'} onClick={() => w.set({ seasonMode: 'auto' })}>
          Follow the calendar
        </PixelButton>
        {SEASONS.map((x) => (
          <PixelButton key={x} variant="quiet" aria-pressed={w.seasonMode === 'manual' && w.manualSeason === x}
            onClick={() => w.set({ seasonMode: 'manual', manualSeason: x })}>
            {SEASON_LABEL[x]}
          </PixelButton>
        ))}
      </div>
      <p className={s.label}>Weather</p>
      <div className={s.row}>
        <PixelButton variant="quiet" aria-pressed={w.weatherMode === 'auto'} onClick={askLocal} disabled={weatherBusy}>
          {weatherBusy ? 'Looking at the sky…' : 'Match my local weather'}
        </PixelButton>
        <PixelButton variant="quiet" aria-pressed={w.weatherMode === 'random'} onClick={() => w.set({ weatherMode: 'random' })}>
          Surprise me
        </PixelButton>
        {WEATHERS.map((x) => (
          <PixelButton key={x} variant="quiet" aria-pressed={w.weatherMode === 'manual' && w.manualWeather === x}
            onClick={() => w.set({ weatherMode: 'manual', manualWeather: x })}>
            {WEATHER_LABEL[x]}
          </PixelButton>
        ))}
      </div>
      {weatherNote && <p className={s.note}>{weatherNote}</p>}
      <p className={s.label}>Motion</p>
      <div className={s.row}>
        <PixelButton variant="quiet" aria-pressed={w.reducedMotion} onClick={() => w.set({ reducedMotion: !w.reducedMotion })}>
          Reduce motion
        </PixelButton>
      </div>
      <p className={s.label}>What you enjoy</p>
      <LearnedSection />
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
        {sess.repo.kind === 'account' ? `Saved to your account (${sess.email}).` : 'Saved on this device.'} Anything you set here overrides the automatic choice.
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
        <PixelButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Keep this look'}</PixelButton>
      </div>
    </Modal>
  );
}

function PetPanel({ onClose }: { onClose: () => void }) {
  const pet = useSession((st) => st.pet);
  const walking = useWorld((st) => st.walkingPet);
  const [name, setName] = useState(pet?.name ?? '');
  const name0 = pet?.name || 'Your companion';
  const act = (kind: 'pet' | 'treat' | 'ball' | 'walk') => {
    onClose();
    // let the menu close before the moment happens, so you can watch it
    window.setTimeout(() => bus.emit('pet:act', { kind }), 60);
  };
  const rename = async () => {
    if (!pet || !name.trim() || name.trim() === pet.name) return;
    const next = { ...pet, name: name.trim() };
    useSession.getState().set({ pet: next });
    await useSession.getState().repo.savePet(next).catch(() => undefined);
  };
  return (
    <Modal title={name0} onClose={onClose}>
      <p className={s.reading}>{name0} looks up at you, perfectly content. There’s nothing they need. Would you like to spend a moment together?</p>
      <div className={s.row}>
        <PixelButton variant="quiet" onClick={() => act('pet')}>Give a scratch</PixelButton>
        <PixelButton variant="quiet" onClick={() => act('treat')}>Offer a treat</PixelButton>
        <PixelButton variant="quiet" onClick={() => act('ball')}>Play fetch</PixelButton>
        <PixelButton variant="quiet" aria-pressed={walking} onClick={() => act('walk')}>
          {walking ? 'Let them wander' : 'Walk together'}
        </PixelButton>
      </div>
      <p className={s.label}>Name</p>
      <div className={s.row}>
        <input className={s.input} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Pet name" />
        <PixelButton variant="quiet" onClick={rename} disabled={!name.trim() || name.trim() === pet?.name}>Rename</PixelButton>
      </div>
      <p className={s.note}>Tip: click {name0} in the world, or press P, to open this.</p>
      <PixelButton onClick={onClose}>Close</PixelButton>
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


