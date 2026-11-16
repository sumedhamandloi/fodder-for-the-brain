import { useState } from 'react';
import type { FormEvent } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { AvatarCreator, AvatarPreview } from '../avatar/AvatarCreator';
import { useSession, continueAsGuest, enterWorld, finishOnboarding, sendMagicLink } from '../../state/session';
import { supabase } from '../../services/supabase';
import type { AvatarConfig } from '../avatar/types';
import type { PetRecord, Profile } from '../../services/repository';
import s from './Screens.module.css';

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 'peach', hairStyle: 'bob', hairColor: 'chestnut', eyes: 'round', outfit: 'blouse',
  outfitColor: 'sage', shoes: 'brown', hat: 'straw', accessory: 'none', backpack: 'none',
};

export function TitleScreen() {
  const { profile, email, repo, error } = useSession();
  const returning = !!profile?.onboardingDone;
  return (
    <div className={s.center}>
      <PixelPanel className={s.title}>
        <h1 className={s.logo}>Fodder for the Brain</h1>
        <p className={s.tagline}>A little garden for a wandering mind.</p>
        <div className={s.stack}>
          {returning ? (
            <PixelButton onClick={enterWorld}>Enter the garden</PixelButton>
          ) : (
            <PixelButton onClick={continueAsGuest}>
              {repo.kind === 'account' ? 'Begin' : 'Wander in as a guest'}
            </PixelButton>
          )}
          {repo.kind === 'device' && supabase && (
            <PixelButton variant="quiet" onClick={() => useSession.getState().set({ stage: 'signin' })}>
              Sign in to keep your garden everywhere
            </PixelButton>
          )}
        </div>
        <p className={s.small}>
          {repo.kind === 'account' ? `Signed in as ${email}` : 'As a guest, your garden lives on this device.'}
        </p>
        {error && <p className={s.error}>We couldn't reach your saved garden ({error}). You're wandering on this device for now.</p>}
      </PixelPanel>
    </div>
  );
}

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      await sendMagicLink(email.trim());
      setState('sent');
    } catch (err) {
      setMsg((err as Error).message);
      setState('error');
    }
  };
  const back = () => useSession.getState().set({ stage: 'title' });
  return (
    <div className={s.center}>
      <PixelPanel className={s.card} title="Sign in">
        {state === 'sent' ? (
          <>
            <p className={s.reading}>
              A little letter is on its way to <b>{email}</b>. Open the link inside and you'll come straight back to your garden.
            </p>
            <PixelButton variant="quiet" onClick={back}>Back</PixelButton>
          </>
        ) : (
          <form onSubmit={submit} className={s.stack}>
            <p className={s.reading}>No passwords. We'll email you a link that lets you in.</p>
            <label className={s.field}>
              <span>Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
            </label>
            {state === 'error' && <p className={s.error}>{msg}</p>}
            <div className={s.row}>
              <button type="submit" className={s.submit} disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send my link'}
              </button>
              <PixelButton variant="quiet" onClick={back}>Back</PixelButton>
            </div>
          </form>
        )}
      </PixelPanel>
    </div>
  );
}

const TOPICS = ['Science', 'Psychology', 'Philosophy', 'History', 'Nature', 'Art', 'Literature', 'Technology'];
const SPECIES: { id: PetRecord['species']; label: string; ready: boolean }[] = [
  { id: 'frog', label: 'Frog', ready: true },
  { id: 'cat', label: 'Cat', ready: false },
  { id: 'dog', label: 'Dog', ready: false },
  { id: 'rabbit', label: 'Rabbit', ready: false },
  { id: 'duck', label: 'Duck', ready: false },
  { id: 'hedgehog', label: 'Hedgehog', ready: false },
];

export function Onboarding() {
  const sess = useSession();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(sess.profile?.displayName ?? '');
  const [avatar, setAvatar] = useState<AvatarConfig>(sess.avatar ?? DEFAULT_AVATAR);
  const [pet, setPet] = useState<PetRecord>(sess.pet ?? { species: 'frog', name: '' });
  const [interests, setInterests] = useState<string[]>(sess.profile?.interests ?? []);
  const [depth, setDepth] = useState<Profile['preferredDepth']>(sess.profile?.preferredDepth ?? 'medium');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const finish = async () => {
    setSaving(true);
    try {
      await finishOnboarding(
        { displayName: name.trim(), interests, preferredDepth: depth, onboardingDone: true },
        avatar,
        { species: pet.species, name: pet.name.trim() || 'Pip' },
      );
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  };

  const steps = ['Your name', 'Yourself', 'A companion', 'What feeds you'];
  return (
    <div className={s.center}>
      <PixelPanel className={step === 1 ? s.wide : s.card} title={steps[step]}>
        <p className={s.progress} aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, i) => (
            <span key={i} className={i <= step ? s.dotOn : s.dot} />
          ))}
        </p>

        {step === 0 && (
          <form className={s.stack} onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(1); }}>
            <p className={s.reading}>What should the garden call you?</p>
            <label className={s.field}>
              <span>Name</span>
              <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            <div className={s.row}>
              <button type="submit" className={s.submit} disabled={!name.trim()}>Next</button>
            </div>
          </form>
        )}

        {step === 1 && (
          <>
            <AvatarCreator value={avatar} onChange={setAvatar} />
            <div className={s.row}>
              <PixelButton variant="quiet" onClick={() => setStep(0)}>Back</PixelButton>
              <PixelButton onClick={() => setStep(2)}>This is me</PixelButton>
            </div>
          </>
        )}

        {step === 2 && (
          <form className={s.stack} onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
            <p className={s.reading}>Every garden has a friend. Yours will follow you around, nap in the sun and never need anything from you.</p>
            <div className={s.species} role="radiogroup" aria-label="Companion">
              {SPECIES.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  role="radio"
                  aria-checked={pet.species === sp.id}
                  disabled={!sp.ready}
                  className={s.speciesCard}
                  onClick={() => setPet({ ...pet, species: sp.id })}
                >
                  {sp.ready ? <span className={s.frog} aria-hidden="true" /> : <span className={s.soon} aria-hidden="true">?</span>}
                  {sp.label}
                  {!sp.ready && <small>arriving soon</small>}
                </button>
              ))}
            </div>
            <label className={s.field}>
              <span>Their name</span>
              <input value={pet.name} maxLength={24} placeholder="Pip" onChange={(e) => setPet({ ...pet, name: e.target.value })} />
            </label>
            <div className={s.row}>
              <PixelButton variant="quiet" onClick={() => setStep(1)}>Back</PixelButton>
              <button type="submit" className={s.submit}>Next</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className={s.stack}>
            <p className={s.reading}>Pick anything that tugs at your curiosity. This only shapes suggestions, and you can skip it.</p>
            <div className={s.chips}>
              {TOPICS.map((t) => (
                <PixelButton
                  key={t}
                  variant="quiet"
                  aria-pressed={interests.includes(t)}
                  onClick={() => setInterests(interests.includes(t) ? interests.filter((x) => x !== t) : [...interests, t])}
                >
                  {t}
                </PixelButton>
              ))}
            </div>
            <p className={s.reading}>How long do you like to linger?</p>
            <div className={s.chips}>
              {(['short', 'medium', 'deep'] as const).map((d) => (
                <PixelButton key={d} variant="quiet" aria-pressed={depth === d} onClick={() => setDepth(d)}>
                  {{ short: 'A few minutes', medium: 'A cup of tea', deep: 'A long afternoon' }[d]}
                </PixelButton>
              ))}
            </div>
            {err && <p className={s.error}>{err}</p>}
            <div className={s.row}>
              <PixelButton variant="quiet" onClick={() => setStep(2)}>Back</PixelButton>
              <PixelButton onClick={finish} disabled={saving}>{saving ? 'Opening the gate…' : 'Into the garden'}</PixelButton>
            </div>
            <div className={s.peek} aria-hidden="true">
              <AvatarPreview config={avatar} scale={3} />
              <span className={s.frog} />
            </div>
          </div>
        )}
      </PixelPanel>
    </div>
  );
}
