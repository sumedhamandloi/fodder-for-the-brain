import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AccountRepository, DeviceRepository, PetRecord, Profile, SaveRepository } from '../services/repository';
import type { AvatarConfig } from '../features/avatar/types';

export type Stage = 'loading' | 'title' | 'signin' | 'onboarding' | 'world';

interface SessionState {
  stage: Stage;
  email: string | null;
  repo: SaveRepository;
  profile: Profile | null;
  avatar: AvatarConfig | null;
  pet: PetRecord | null;
  error: string | null;
  set: (p: Partial<SessionState>) => void;
}

const device = new DeviceRepository();

export const useSession = create<SessionState>((set) => ({
  stage: 'loading',
  email: null,
  repo: device,
  profile: null,
  avatar: null,
  pet: null,
  error: null,
  set: (p) => set(p),
}));

const GUEST_FLAG = 'fodder.guest';

async function adopt(repo: SaveRepository, email: string | null) {
  const s = useSession.getState();
  try {
    let data = await repo.load();
    // First sign-in after wandering as a guest: carry the guest's world into the account.
    if (repo.kind === 'account' && !data.profile?.onboardingDone && device.hasData()) {
      const local = await device.load();
      if (local.profile) await repo.saveProfile(local.profile);
      if (local.avatar) await repo.saveAvatar(local.avatar);
      if (local.pet) await repo.savePet(local.pet);
      data = await repo.load();
    }
    s.set({
      repo, email, ...data, error: null,
      stage: data.profile?.onboardingDone ? 'title' : repo.kind === 'account' ? 'onboarding' : 'title',
    });
  } catch (e) {
    s.set({ repo: device, error: (e as Error).message, stage: 'title' });
  }
}

/** Decide where to start: an existing account session, a returning guest, or the title screen. */
export async function bootSession() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    supabase.auth.onAuthStateChange((event, session: Session | null) => {
      if (event === 'SIGNED_IN' && session && useSession.getState().repo.kind !== 'account')
        adopt(new AccountRepository(session.user.id), session.user.email ?? null);
      if (event === 'SIGNED_OUT') adopt(device, null);
    });
    if (data.session) return adopt(new AccountRepository(data.session.user.id), data.session.user.email ?? null);
  }
  return adopt(device, null);
}

export function continueAsGuest() {
  try {
    localStorage.setItem(GUEST_FLAG, '1');
  } catch {
    /* fine */
  }
  const s = useSession.getState();
  s.set({ stage: s.profile?.onboardingDone ? 'world' : 'onboarding' });
}

export async function enterWorld() {
  const s = useSession.getState();
  s.set({ stage: s.profile?.onboardingDone ? 'world' : 'onboarding' });
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('Accounts are not configured for this build.');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

export async function finishOnboarding(profile: Profile, avatar: AvatarConfig, pet: PetRecord) {
  const s = useSession.getState();
  const done = { ...profile, onboardingDone: true };
  await s.repo.saveAvatar(avatar);
  await s.repo.savePet(pet);
  await s.repo.saveProfile(done);
  s.set({ profile: done, avatar, pet, stage: 'world' });
}

export async function updateAvatar(avatar: AvatarConfig) {
  const s = useSession.getState();
  await s.repo.saveAvatar(avatar);
  s.set({ avatar });
}
