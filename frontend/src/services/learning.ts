import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { currentPhase, useWorld } from '../state/world';
import { useSession } from '../state/session';

/**
 * Talks to the Python learning engine (backend/). Optional: without VITE_API_URL, or if the person
 * turns learning off, nothing is sent and the app falls back to its curated suggestions.
 *
 * What is sent: content ids, the kind of action, and the time-of-day phase. Never journal text, never location.
 */
const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
export const learningAvailable = !!API;

type Kind = 'open' | 'finish' | 'save' | 'unsave' | 'follow' | 'depth' | 'npc_curiosity';
interface Ev { kind: Kind; item?: string; to?: string; value?: string; phase?: string; at: number }

let queue: Ev[] = [];
let timer: number | null = null;

function guestId() {
  try {
    let id = localStorage.getItem('fodder.guest.id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('fodder.guest.id', id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

async function headers(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = useSession.getState().repo.kind === 'account' ? (await supabase?.auth.getSession())?.data.session?.access_token : null;
  if (token) h.Authorization = `Bearer ${token}`;
  else h['X-Fodder-Guest'] = guestId();
  return h;
}

const enabled = () => learningAvailable && useWorld.getState().learning;

/** Record a gentle signal. Batched and sent every few seconds, or when the tab is hidden. */
export function track(kind: Kind, data: { item?: string; to?: string; value?: string } = {}) {
  if (!enabled()) return;
  queue.push({ kind, ...data, phase: currentPhase(useWorld.getState()), at: Date.now() / 1000 });
  if (timer === null) timer = window.setTimeout(flush, 4000);
}

export async function flush() {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  if (!queue.length || !enabled()) return;
  const events = queue;
  queue = [];
  try {
    await fetch(`${API}/api/v1/events`, { method: 'POST', headers: await headers(), body: JSON.stringify({ events }), keepalive: true });
  } catch {
    /* engine offline: drop quietly; suggestions just stay curated */
  }
}

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

export interface Pick { id: string; reason: string; kind: 'for_you' | 'explore' | 'starter' }

/** At most three suggestions for a surface, each with its reason. Empty when learning is off or offline. */
export function usePicks(surface: 'library' | 'curiosity' | 'follow', item?: string) {
  const [items, setItems] = useState<Pick[]>([]);
  const learning = useWorld((s) => s.learning);
  useEffect(() => {
    if (!learningAvailable || !learning) return setItems([]);
    let live = true;
    (async () => {
      await flush(); // make sure what just happened is counted
      const q = new URLSearchParams({ surface, phase: currentPhase(useWorld.getState()) });
      if (item) q.set('item', item);
      for (const t of useSession.getState().profile?.interests ?? []) q.append('interests', t);
      try {
        const r = await fetch(`${API}/api/v1/recommendations?${q}`, { headers: await headers() });
        if (r.ok && live) setItems((await r.json()).slice(0, 3));
      } catch {
        if (live) setItems([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [surface, item, learning]);
  return { items };
}

export interface LearnedProfile {
  events: number;
  topics: { topic: string; affinity: number; confidence: number }[];
  prefers_deep: number;
  closest_reads: { id: string; title: string }[];
}

export async function fetchProfile(): Promise<LearnedProfile | null> {
  if (!learningAvailable) return null;
  await flush();
  const r = await fetch(`${API}/api/v1/profile`, { headers: await headers() });
  return r.ok ? r.json() : null;
}

export async function forgetMe() {
  queue = [];
  if (!learningAvailable) return;
  await fetch(`${API}/api/v1/profile`, { method: 'DELETE', headers: await headers() });
}
