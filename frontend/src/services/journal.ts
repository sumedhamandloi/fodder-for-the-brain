import { supabase } from './supabase';
import { useSession } from '../state/session';

export interface JournalEntry {
  id: string;
  kind: 'journal' | 'observation';
  prompt?: string | null;
  body: string;
  createdAt: string;
}

const LS_KEY = 'fodder.journal.v1';
export const PAGE_SIZE = 8;

function readLocal(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function writeLocal(e: JournalEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(e));
  } catch {
    /* storage unavailable */
  }
}

const account = () => {
  const s = useSession.getState();
  return s.repo.kind === 'account' && supabase ? supabase : null;
};

/** One finite page of entries, newest first. Private: stays on this device or in your account. */
export async function listEntries(page: number): Promise<{ entries: JournalEntry[]; more: boolean }> {
  const db = account();
  if (!db) {
    const all = readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { entries: all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), more: all.length > (page + 1) * PAGE_SIZE };
  }
  const { data, error } = await db
    .from('journal_entries')
    .select('id,kind,prompt,body,created_at')
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE); // one extra row tells us if there is an earlier page
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({ id: r.id, kind: r.kind, prompt: r.prompt, body: r.body, createdAt: r.created_at }));
  return { entries: rows.slice(0, PAGE_SIZE), more: rows.length > PAGE_SIZE };
}

export async function addEntry(kind: JournalEntry['kind'], body: string, prompt?: string) {
  const db = account();
  if (!db) {
    const e: JournalEntry = { id: crypto.randomUUID(), kind, body, prompt: prompt ?? null, createdAt: new Date().toISOString() };
    writeLocal([...readLocal(), e]);
    return;
  }
  const userId = (await db.auth.getUser()).data.user?.id;
  const { error } = await db.from('journal_entries').insert({ user_id: userId, kind, body, prompt: prompt ?? null });
  if (error) throw error;
}

export async function deleteEntry(id: string) {
  const db = account();
  if (!db) return writeLocal(readLocal().filter((e) => e.id !== id));
  const { error } = await db.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}
