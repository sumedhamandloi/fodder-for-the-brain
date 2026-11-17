/**
 * Curated library content v0.1. Every piece carries its sources.
 * Status: written for Milestone 4. Needs an editorial review before public launch.
 */
import readsJson from './reads.json';

export type Topic = 'Science' | 'Psychology' | 'Philosophy' | 'History' | 'Nature' | 'Art' | 'Literature' | 'Technology';
export type Depth = 'short' | 'deep';

export interface Source {
  label: string;
  url: string;
}

export interface Read {
  id: string;
  title: string;
  topic: Topic;
  depth: Depth;
  minutes: number;
  hook: string; // one-line teaser shown on the shelf
  body: string[]; // paragraphs; lines starting with "## " are subheadings
  reflect: string; // a question to sit with
  sources: Source[];
  related: string[]; // at most three ids: "follow the thought"
}

/** The reads live in reads.json so the Python learning engine can use exactly the same library. */
export const READS: Read[] = readsJson as Read[];

export const SHELVES: { id: string; label: string; topics: Topic[] }[] = [
  { id: 'shelf_world', label: 'The World Around Us', topics: ['Science', 'Nature', 'Technology'] },
  { id: 'shelf_stories', label: 'Stories & Making', topics: ['History', 'Art', 'Literature'] },
  { id: 'shelf_mind', label: 'Mind & Meaning', topics: ['Psychology', 'Philosophy'] },
];

export const byId = (id: string) => READS.find((r) => r.id === id);

/** The same "today's read" for everyone on a given local date. Nothing to catch up on if you miss a day. */
export function readOfTheDay(d = new Date()): Read {
  const key = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
  return READS[key % READS.length];
}
