import { useEffect, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { useSession } from '../../state/session';
import { byId } from '../library/content';
import { addEntry, deleteEntry, listEntries, JournalEntry } from '../../services/journal';
import { isPlaying, startAmbience, stopAmbience } from './ambience';
import s from './Pond.module.css';

/** Gentle prompts for paying attention. There is no right answer and nothing to finish. */
const NOTICE = [
  'Look at the water for a minute. How many different kinds of movement can you find?',
  'Listen. What is the quietest sound you can hear right now?',
  'Find something nearby that is a colour you hadn’t noticed today.',
  'Watch one leaf, cloud or ripple until it changes. What changed first?',
  'What does the air feel like on your skin at this moment?',
  'Notice your breathing without changing it. Is it fast, slow, shallow, deep?',
  'Pick one plant or tree you can see. What shape do its leaves make?',
  'Is there any light moving: reflections, flickers, shadows? Follow it for a moment.',
  'What smell is in the air, even a faint one?',
  'Find three things that are perfectly still.',
  'Look at the sky. What is it doing that it wasn’t doing an hour ago?',
  'What small creature could be living within a metre of you?',
];

type Tab = 'notice' | 'journal' | 'garden';

export function PondOverlay() {
  const open = useWorld((st) => st.atPond);
  const [tab, setTab] = useState<Tab>('notice');
  const [sound, setSound] = useState(isPlaying());
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;

  const leave = () => {
    useWorld.getState().set({ atPond: false });
  };
  const toggleSound = async () => {
    if (sound) stopAmbience();
    else await startAmbience();
    setSound(!sound);
  };

  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && leave()}>
      <PixelPanel className={s.panel} title="The Pond" role="dialog" aria-modal="true" aria-label="The Pond">
        <p className={s.lede}>You sit at the end of the dock. The water is in no hurry, and neither are you.</p>
        <div className={s.tabs} role="tablist">
          {(
            [
              ['notice', 'Notice'],
              ['journal', 'Journal'],
              ['garden', 'My Mind Garden'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <PixelButton key={id} variant="quiet" role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </PixelButton>
          ))}
          <span className={s.spacer} />
          <PixelButton variant="quiet" aria-pressed={sound} onClick={toggleSound}>
            {sound ? 'Sound on' : 'Sound off'}
          </PixelButton>
        </div>

        {tab === 'notice' && <Notice />}
        {tab === 'journal' && <Journal />}
        {tab === 'garden' && <MindGarden />}

        <div className={s.footer}>
          <PixelButton onClick={leave}>Stand up and stretch</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}

function Notice() {
  const [i, setI] = useState(() => Math.floor(Math.random() * NOTICE.length));
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  const save = async () => {
    try {
      await addEntry('observation', text.trim(), NOTICE[i]);
      setText('');
      setState('saved');
    } catch {
      setState('error');
    }
  };
  return (
    <section className={s.section}>
      <p className={s.prompt}>{NOTICE[i]}</p>
      <PixelButton variant="quiet" onClick={() => { setI((i + 1) % NOTICE.length); setState('idle'); }}>
        Another thing to notice
      </PixelButton>
      <label className={s.field}>
        <span>What did you notice? (optional)</span>
        <textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); setState('idle'); }} />
      </label>
      <div className={s.row}>
        <PixelButton onClick={save} disabled={!text.trim()}>Keep this observation</PixelButton>
        {state === 'saved' && <span className={s.ok}>Tucked into your journal.</span>}
        {state === 'error' && <span className={s.err}>That didn’t save. Your words are still here.</span>}
      </div>
    </section>
  );
}

function Journal() {
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [more, setMore] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const load = async (p = page) => {
    try {
      const r = await listEntries(p);
      setEntries(r.entries);
      setMore(r.more);
      setErr('');
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  const save = async () => {
    try {
      await addEntry('journal', text.trim());
      setText('');
      setPage(0);
      load(0);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Let this entry go? It will be deleted for good.')) return;
    await deleteEntry(id).catch(() => undefined);
    load();
  };
  return (
    <section className={s.section}>
      <label className={s.field}>
        <span>Write whatever is on your mind</span>
        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <p className={s.privacy}>Private to you. Never shared, and never sent to any AI.</p>
      <div className={s.row}>
        <PixelButton onClick={save} disabled={!text.trim()}>Keep this entry</PixelButton>
      </div>
      {err && <p className={s.err}>{err}</p>}
      <ul className={s.entries}>
        {entries.map((e) => (
          <li key={e.id} className={s.entry}>
            <div className={s.entryMeta}>
              {new Date(e.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              {e.kind === 'observation' ? ' · observation' : ''}
              <button type="button" className={s.linkBtn} onClick={() => remove(e.id)}>let go</button>
            </div>
            {e.prompt && <p className={s.entryPrompt}>{e.prompt}</p>}
            <p className={s.entryBody}>{e.body}</p>
          </li>
        ))}
        {!entries.length && !err && <li className={s.empty}>Your journal is empty, and that’s perfectly fine.</li>}
      </ul>
      {(page > 0 || more) && (
        <div className={s.row}>
          {page > 0 && <PixelButton variant="quiet" onClick={() => setPage(page - 1)}>Newer pages</PixelButton>}
          {more && <PixelButton variant="quiet" onClick={() => setPage(page + 1)}>Earlier pages</PixelButton>}
        </div>
      )}
    </section>
  );
}

function MindGarden() {
  const ideas = useSession((st) => st.ideas);
  const reads = ideas.map(byId).filter(Boolean);
  const openRead = (id: string) => useWorld.getState().set({ atPond: false, reading: { kind: 'read', id } });
  return (
    <section className={s.section}>
      <p className={s.text}>
        Every idea you save in the Little Library takes root here. Tap a flower to read it again.
      </p>
      <div className={s.bed} role="list" aria-label="Your Mind Garden">
        {reads.slice(0, 12).map((r, i) => (
          <button
            key={r!.id}
            type="button"
            role="listitem"
            className={s.flower}
            style={{
              backgroundPosition: `calc(var(--px) * ${-16 * 2 * (hash(r!.id) % 6)}) 0`,
              left: `calc(var(--px) * ${2 * (10 + (i % 6) * 26 + (i >= 6 ? 13 : 0))})`,
              top: `calc(var(--px) * ${2 * (i >= 6 ? 26 : 8)})`,
            }}
            title={r!.title}
            aria-label={r!.title}
            onClick={() => openRead(r!.id)}
          />
        ))}
      </div>
      {!reads.length && <p className={s.empty}>Nothing growing yet. Save an idea in the Little Library and a flower will appear here.</p>}
      {reads.length > 12 && <p className={s.text}>{reads.length - 12} more ideas are waiting in the library armchair.</p>}
    </section>
  );
}

function hash(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
