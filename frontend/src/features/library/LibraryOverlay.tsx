import { useEffect, useRef, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld, LibraryView } from '../../state/world';
import { useSession, toggleIdea } from '../../state/session';
import { READS, SHELVES, byId, Read } from './content';
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
      {view.kind === 'read' && <Reader id={view.id} from={view.from} scrollRef={ref} />}
    </div>
  );
}

function ReadCard({ r, from }: { r: Read; from: LibraryView }) {
  const saved = useSession((st) => st.ideas.includes(r.id));
  return (
    <li>
      <button type="button" className={s.cardBtn} onClick={() => open({ kind: 'read', id: r.id, from })}>
        <span className={s.cardMeta}>
          {r.topic} · {r.depth === 'deep' ? 'Deep dive' : 'Short read'} · {r.minutes} min{saved ? ' · saved' : ''}
        </span>
        <span className={s.cardTitle}>{r.title}</span>
        <span className={s.cardHook}>{r.hook}</span>
      </button>
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
          <PixelButton key={d} variant="quiet" aria-pressed={depth === d} onClick={() => setDepth(d)}>
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
      <aside className={s.reflect}>
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
          {r.related.slice(0, 3).map((rid) => {
            const n = byId(rid);
            return n ? (
              <button key={rid} type="button" className={s.followBtn} onClick={() => open({ kind: 'read', id: rid, from })}>
                <span className={s.cardMeta}>{n.topic}</span>
                {n.title}
              </button>
            ) : null;
          })}
        </div>
      </section>
      <div className={s.actions}>
        <PixelButton variant="quiet" aria-pressed={saved} onClick={() => toggleIdea(id)}>
          {saved ? 'Saved to your ideas' : 'Save this idea'}
        </PixelButton>
        {from && <PixelButton variant="quiet" onClick={() => open(from)}>Back</PixelButton>}
        <PixelButton onClick={close}>Close the book</PixelButton>
      </div>
    </article>
  );
}
