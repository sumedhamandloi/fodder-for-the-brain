import { supabase } from './supabase';
import type { AvatarConfig } from '../features/avatar/types';

export interface Profile {
  displayName: string;
  interests: string[];
  preferredDepth: 'short' | 'medium' | 'deep';
  onboardingDone: boolean;
}

export interface PetRecord {
  species: 'frog' | 'cat' | 'dog' | 'rabbit' | 'duck' | 'hedgehog';
  name: string;
}

export interface SaveData {
  profile: Profile | null;
  avatar: AvatarConfig | null;
  pet: PetRecord | null;
  ideas: string[]; // saved library reads (content ids)
}

/** Where a player's world is kept. Guests use this device; accounts use Supabase (RLS-protected). */
export interface SaveRepository {
  readonly kind: 'device' | 'account';
  load(): Promise<SaveData>;
  saveProfile(p: Profile): Promise<void>;
  saveAvatar(a: AvatarConfig): Promise<void>;
  savePet(p: PetRecord): Promise<void>;
  setIdea(contentId: string, saved: boolean): Promise<void>;
}

const LS_KEY = 'fodder.save.v1';

export class DeviceRepository implements SaveRepository {
  readonly kind = 'device' as const;
  private read(): SaveData {
    try {
      return { profile: null, avatar: null, pet: null, ideas: [], ...JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') };
    } catch {
      return { profile: null, avatar: null, pet: null, ideas: [] };
    }
  }
  private write(patch: Partial<SaveData>) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ ...this.read(), ...patch }));
    } catch {
      /* storage unavailable: progress lasts for this visit only */
    }
  }
  async load() {
    return this.read();
  }
  async saveProfile(profile: Profile) {
    this.write({ profile });
  }
  async saveAvatar(avatar: AvatarConfig) {
    this.write({ avatar });
  }
  async savePet(pet: PetRecord) {
    this.write({ pet });
  }
  async setIdea(id: string, saved: boolean) {
    const ideas = this.read().ideas.filter((x) => x !== id);
    this.write({ ideas: saved ? [...ideas, id] : ideas });
  }
  hasData() {
    const d = this.read();
    return !!(d.profile || d.avatar || d.pet);
  }
}

export class AccountRepository implements SaveRepository {
  readonly kind = 'account' as const;
  constructor(private userId: string) {}

  async load(): Promise<SaveData> {
    const db = supabase!;
    const [p, a, pet, ideas] = await Promise.all([
      db.from('profiles').select('*').eq('user_id', this.userId).maybeSingle(),
      db.from('avatars').select('config').eq('user_id', this.userId).maybeSingle(),
      db.from('pets').select('species,name').eq('user_id', this.userId).order('adopted_at').limit(1).maybeSingle(),
      db.from('saved_ideas').select('content_id').eq('user_id', this.userId).order('saved_at'),
    ]);
    for (const r of [p, a, pet]) if (r.error) throw r.error;
    return {
      profile: p.data
        ? {
            displayName: p.data.display_name,
            interests: p.data.interests ?? [],
            preferredDepth: p.data.preferred_depth,
            onboardingDone: p.data.onboarding_done,
          }
        : null,
      avatar: (a.data?.config as AvatarConfig) ?? null,
      pet: (pet.data as PetRecord) ?? null,
      // the library table may not exist yet if migration 0002 hasn't been run; ideas then start empty
      ideas: ideas.error ? [] : (ideas.data ?? []).map((r: { content_id: string }) => r.content_id),
    };
  }

  async saveProfile(p: Profile) {
    const { error } = await supabase!.from('profiles').upsert({
      user_id: this.userId,
      display_name: p.displayName,
      interests: p.interests,
      preferred_depth: p.preferredDepth,
      onboarding_done: p.onboardingDone,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async saveAvatar(config: AvatarConfig) {
    const { error } = await supabase!
      .from('avatars')
      .upsert({ user_id: this.userId, config, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async savePet(p: PetRecord) {
    const db = supabase!;
    const existing = await db.from('pets').select('id').eq('user_id', this.userId).limit(1).maybeSingle();
    if (existing.error) throw existing.error;
    const { error } = existing.data
      ? await db.from('pets').update({ species: p.species, name: p.name }).eq('id', existing.data.id)
      : await db.from('pets').insert({ user_id: this.userId, species: p.species, name: p.name });
    if (error) throw error;
  }

  async setIdea(contentId: string, saved: boolean) {
    const db = supabase!.from('saved_ideas');
    const { error } = saved
      ? await db.upsert({ user_id: this.userId, content_id: contentId })
      : await db.delete().eq('user_id', this.userId).eq('content_id', contentId);
    if (error) throw error;
  }
}

