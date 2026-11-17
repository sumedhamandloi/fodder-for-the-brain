import { useEffect, useRef, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld, LibraryView } from '../../state/world';
import { useSession, toggleIdea } from '../../state/session';
import { READS, SHELVES, byId, Read, readOfTheDay } from './content';
import { track, usePicks } from '../../services/learning';
import s from './Library.module.css';

const close = () => useWorld.getState().set({ reading: null });
const open = (v: LibraryView) => useWorld.getState().set({ reading: v });

export function LibraryOverlay() {
  const view = useWorld((st) => st.reading);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo?.(0, 0);
    ref.current?.querySelector<HTMLElement>('h2, button')?.focus();
  }, [view]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!view) return null;
  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && close()}>
      {view.kind === 'shelf' && <Shelf id={view.id} />}
      {view.kind === 'saved' && <Saved />}
      {view.kind === 'desk' && <Desk />}
      {view.kind === 'read' && <Reader id={view.id} from={view.from} scrollRef={ref} />}
    </div>
  );
}

function ReadCardInner({ r, from }: { r: Read; from: LibraryView }) {
  const saved = useSession((st) => st.ideas.includes(r.id));
  return (
    <button type="button" className={s.cardBtn} onClick={() => open({ kind: 'read', id: r.id, from })}>
      <span className={s.cardMeta}>
        {r.topic} · {r.depth === 'deep' ? 'Deep dive' : 'Short read'} · {r.minutes} min{saved ? ' · saved' : ''}
      </span>
      <span className={s.cardTitle}>{r.title}</span>
      <span className={s.cardHook}>{r.hook}</span>
    </button>
  );
}

function ReadCard({ r, from }: { r: Read; from: LibraryView }) {
  return (
    <li>
      <ReadCardInner r={r} from={from} />
    </li>
  );
}

function Shelf({ id }: { id: string }) {
  const shelf = SHELVES.find((x) => x.id === id)!;
  const [depth, setDepth] = useState<'all' | 'short' | 'deep'>('all');
  const reads = READS.filter((r) => shelf.topics.includes(r.topic) && (depth === 'all' || r.depth === depth));
  return (
    <PixelPanel className={s.panel} title={shelf.label} role="dialog" aria-modal="true" aria-label={shelf.label}>
      <p className={s.sub}>{shelf.topics.join(' · ')}</p>
      <div className={s.row}>
        {(['all', 'short', 'deep'] as const).map((d) => (
          <PixelButton key={d} variant="quiet" aria-pressed={depth === d} onClick={() => { setDepth(d); if (d !== 'all') track('depth', { value: d }); }}>
            {{ all: 'Everything', short: 'Short reads', deep: 'Deep dives' }[d]}
          </PixelButton>
        ))}
      </div>
      <ul className={s.cards}>
        {reads.map((r) => (
          <ReadCard key={r.id} r={r} from={{ kind: 'shelf', id }} />
        ))}
      </ul>
      <PixelButton onClick={close}>Put the books back</PixelButton>
    </PixelPanel>
  );
}

/** The reading desk: today's read for everyone, plus (if the learning engine is reachable) three picks for you. */
function Desk() {
  const today = readOfTheDay();
  const picks = usePicks('library');
  return (
    <PixelPanel className={s.panel} title="The reading desk" role="dialog" aria-modal="true" aria-label="The reading desk">
      <p className={s.sub}>Today’s read</p>
      <ul className={s.cards}>
        <ReadCard r={today} from={{ kind: 'desk' }} />
      </ul>
      {picks.items.length > 0 && (
        <>
          <p className={s.sub}>Picked for you</p>
          <ul className={s.cards}>
            {picks.items.map((p) => {
              const r = byId(p.id);
              return r ? (
                <li key={p.id} className={s.pick}>
                  <ReadCardInner r={r} from={{ kind: 'desk' }} />
                  <span className={s.because}>{p.reason}</span>
                </li>
              ) : null;
            })}
          </ul>
        </>
      )}
      <PixelButton onClick={close}>Step away from the desk</PixelButton>
    </PixelPanel>
  );
}

function Saved() {
  const ideas = useSession((st) => st.ideas);
  const reads = ideas.map(byId).filter(Boolean) as Read[];
  return (
    <PixelPanel className={s.panel} title="Your saved ideas" role="dialog" aria-modal="true" aria-label="Your saved ideas">
      {reads.length ? (
        <ul className={s.cards}>
          {reads.map((r) => (
            <ReadCard key={r.id} r={r} from={{ kind: 'saved' }} />
          ))}
        </ul>
      ) : (
        <p className={s.reading}>
          Nothing tucked away yet. When a read stays with you, save it and it will wait for you here, in the armchair by the lamp.
        </p>
      )}
      <PixelButton onClick={close}>Get up from the armchair</PixelButton>
    </PixelPanel>
  );
}

function Reader({ id, from, scrollRef }: { id: string; from?: LibraryView; scrollRef: React.RefObject<HTMLDivElement> }) {
  const r = byId(id)!;
  const saved = useSession((st) => st.ideas.includes(id));
  const reflectRef = useRef<HTMLElement>(null);
  const follow = usePicks('follow', id);
  // learning signals: opening a read, and reaching the reflection question at the end (= finished)
  useEffect(() => {
    track('open', { item: id });
    const el = reflectRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        track('finish', { item: id });
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  const related = follow.items.length ? follow.items.map((p) => p.id) : r.related.slice(0, 3);
  return (
    <article ref={scrollRef} className={s.page} role="dialog" aria-modal="true" aria-label={r.title}>
      <p className={s.kicker}>
        {r.topic} · {r.depth === 'deep' ? 'Deep dive' : 'Short read'} · about {r.minutes} minutes
      </p>
      <h2 className={s.title} tabIndex={-1}>{r.title}</h2>
      {r.body.map((para, i) =>
        para.startsWith('## ') ? (
          <h3 key={i} className={s.h3}>{para.slice(3)}</h3>
        ) : (
          <p key={i} className={s.para}>{para}</p>
        ),
      )}
      <aside className={s.reflect} ref={reflectRef}>
        <span className={s.reflectLabel}>Something to sit with</span>
        <p>{r.reflect}</p>
      </aside>
      <section className={s.sources} aria-label="Sources">
        <h4>Sources</h4>
        <ol>
          {r.sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">{src.label}</a>
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Follow the thought">
        <h4 className={s.followLabel}>Follow the thought</h4>
        <div className={s.follow}>
          {related.map((rid) => {
            const n = byId(rid);
            return n ? (
              <button key={rid} type="button" className={s.followBtn} onClick={() => { track('follow', { item: id, to: rid }); open({ kind: 'read', id: rid, from }); }}>
                <span className={s.cardMeta}>{n.topic}</span>
                {n.title}
              </button>
            ) : null;
          })}
        </div>
      </section>
      <div className={s.actions}>
        <PixelButton variant="quiet" aria-pressed={saved} onClick={() => { track(saved ? 'unsave' : 'save', { item: id }); toggleIdea(id); }}>
          {saved ? 'Saved to your ideas' : 'Save this idea'}
        </PixelButton>
        {from && <PixelButton variant="quiet" onClick={() => open(from)}>Back</PixelButton>}
        <PixelButton onClick={close}>Close the book</PixelButton>
      </div>
    </article>
  );
}
