import { useEffect, useState } from 'react';
import { PixelButton, PixelPanel } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { addEntry } from '../../services/journal';
import { READS, Topic } from '../library/content';
import { CASES, PATTERNS, REFLECTIONS, THOUGHT_EXPERIMENTS, WHAT_ELSE } from './content';
import { npcById } from '../npcs/npcs';
import { track, usePicks } from '../../services/learning';
import s from './Spaces.module.css';

const closeSpace = () => useWorld.getState().set({ space: null, spaceTab: null });
const openRead = (id: string) => useWorld.getState().set({ space: null, dialogue: null, reading: { kind: 'read', id } });

function useEscape(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA' && fn();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, fn]);
}

function Shell({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  useEscape(true, closeSpace);
  return (
    <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && closeSpace()}>
      <PixelPanel className={s.panel} title={title} role="dialog" aria-modal="true" aria-label={title}>
        <p className={s.lede}>{lede}</p>
        {children}
        <div className={s.footer}>
          <PixelButton onClick={closeSpace}>{useWorld.getState().location === 'glasshouse' ? 'Step back' : 'Back to the garden'}</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (t: T) => void }) {
  return (
    <div className={s.tabs} role="tablist">
      {tabs.map(([id, label]) => (
        <PixelButton key={id} variant="quiet" role="tab" aria-selected={value === id} aria-pressed={value === id} onClick={() => onChange(id)}>
          {label}
        </PixelButton>
      ))}
    </div>
  );
}

function WriteBack({ prompt }: { prompt: string }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setText('');
    setSaved(false);
  }, [prompt]);
  return (
    <>
      <label className={s.field}>
        <span>Your thoughts (optional, private)</span>
        <textarea rows={4} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} />
      </label>
      <div className={s.row}>
        <PixelButton onClick={() => addEntry('journal', text.trim(), prompt).then(() => setSaved(true))} disabled={!text.trim()}>
          Keep in my journal
        </PixelButton>
        {saved && <span className={s.ok}>Kept. You’ll find it by the pond.</span>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Glasshouse
function Glasshouse() {
  const [tab, setTab] = useState<'experiments' | 'reflect' | 'connect'>(
    () => (useWorld.getState().spaceTab as 'experiments' | 'reflect' | 'connect' | null) ?? 'experiments',
  );
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [r, setR] = useState(() => Math.floor(Math.random() * REFLECTIONS.length));
  const [pair, setPair] = useState(() => pickPair());
  const t = THOUGHT_EXPERIMENTS[i];
  return (
    <Shell title="The Glasshouse" lede="Warm air, green light, and a few impossible situations to turn over slowly. Nothing to win, nothing to finish.">
      <Tabs tabs={[['experiments', 'Thought experiments'], ['reflect', 'Reflect'], ['connect', 'Connect two ideas']]} value={tab} onChange={setTab} />
      {tab === 'experiments' && (
        <section className={s.section}>
          <h3 className={s.h3}>{t.title}</h3>
          <p className={s.reading}>{t.setup}</p>
          <p className={s.question}>{t.question}</p>
          {show ? (
            <ul className={s.angles}>{t.angles.map((a) => <li key={a}>{a}</li>)}</ul>
          ) : (
            <PixelButton variant="quiet" onClick={() => setShow(true)}>How others have thought about it</PixelButton>
          )}
          <p className={s.source}>{t.origin}</p>
          <WriteBack prompt={`${t.title}: ${t.question}`} />
          <PixelButton variant="quiet" onClick={() => { setI((i + 1) % THOUGHT_EXPERIMENTS.length); setShow(false); }}>Another experiment</PixelButton>
        </section>
      )}
      {tab === 'reflect' && (
        <section className={s.section}>
          <p className={s.question}>{REFLECTIONS[r]}</p>
          <WriteBack prompt={REFLECTIONS[r]} />
          <PixelButton variant="quiet" onClick={() => setR((r + 1) % REFLECTIONS.length)}>A different question</PixelButton>
        </section>
      )}
      {tab === 'connect' && (
        <section className={s.section}>
          <p className={s.reading}>Two ideas from the library, side by side. Is there a thread between them?</p>
          <div className={s.pair}>
            {pair.map((rd) => (
              <button key={rd.id} type="button" className={s.card} onClick={() => openRead(rd.id)}>
                <span className={s.meta}>{rd.topic}</span>
                {rd.title}
              </button>
            ))}
          </div>
          <p className={s.question}>How might “{pair[0].title}” and “{pair[1].title}” be connected?</p>
          <WriteBack prompt={`Connecting “${pair[0].title}” and “${pair[1].title}”`} />
          <PixelButton variant="quiet" onClick={() => setPair(pickPair())}>Two different ideas</PixelButton>
        </section>
      )}
    </Shell>
  );
}

function pickPair() {
  const a = READS[Math.floor(Math.random() * READS.length)];
  const others = READS.filter((x) => x.topic !== a.topic);
  return [a, others[Math.floor(Math.random() * others.length)]] as const;
}

// ---------------------------------------------------------------- Brain Playground
function Playground() {
  const [tab, setTab] = useState<'pattern' | 'detective' | 'whatelse'>('pattern');
  return (
    <Shell title="Brain Playground" lede="Three little games with no clock and no score. Take as long as you like, and peek at the answer whenever you want.">
      <Tabs tabs={[['pattern', 'Pattern Detective'], ['detective', 'Little Detective'], ['whatelse', 'What Else Could It Be?']]} value={tab} onChange={setTab} />
      {tab === 'pattern' && <PatternGame />}
      {tab === 'detective' && <DetectiveGame />}
      {tab === 'whatelse' && <WhatElseGame />}
    </Shell>
  );
}

function PatternGame() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const p = PATTERNS[i];
  return (
    <section className={s.section}>
      <p className={s.reading}>What comes next?</p>
      <div className={s.sequence} aria-label="Sequence">
        {p.sequence.map((x, k) => <span key={k} className={s.tile}>{x}</span>)}
        <span className={`${s.tile} ${s.blank}`}>?</span>
      </div>
      <div className={s.row}>
        {p.options.map((o) => (
          <PixelButton key={o} variant="quiet" aria-pressed={pick === o} onClick={() => setPick(o)}>{o}</PixelButton>
        ))}
      </div>
      {pick && (
        <p className={s.reveal}>
          {pick === p.answer ? 'Yes. ' : `Interesting guess. The pattern points to ${p.answer}. `}
          {p.why}
        </p>
      )}
      <PixelButton variant="quiet" onClick={() => { setI((i + 1) % PATTERNS.length); setPick(null); }}>Another pattern</PixelButton>
    </section>
  );
}

function DetectiveGame() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const c = CASES[i];
  return (
    <section className={s.section}>
      <h3 className={s.h3}>{c.title}</h3>
      <p className={s.reading}>{c.story}</p>
      <ol className={s.clues}>{c.clues.map((cl) => <li key={cl}>{cl}</li>)}</ol>
      <p className={s.question}>{c.question}</p>
      <div className={s.row}>
        {c.options.map((o) => (
          <PixelButton key={o} variant="quiet" aria-pressed={pick === o} onClick={() => setPick(o)}>{o}</PixelButton>
        ))}
      </div>
      {pick && <p className={s.reveal}>{pick === c.answer ? 'Well reasoned. ' : 'Not quite, but let’s walk through it. '}{c.reasoning}</p>}
      <PixelButton variant="quiet" onClick={() => { setI((i + 1) % CASES.length); setPick(null); }}>Another case</PixelButton>
    </section>
  );
}

function WhatElseGame() {
  const [i, setI] = useState(0);
  const [mine, setMine] = useState('');
  const [show, setShow] = useState(false);
  const w = WHAT_ELSE[i];
  const count = mine.split('\n').filter((l) => l.trim()).length;
  return (
    <section className={s.section}>
      <p className={s.question}>{w.observation}</p>
      <p className={s.reading}>How many different explanations can you think of? One per line. There’s no target.</p>
      <label className={s.field}>
        <span>Your explanations</span>
        <textarea rows={5} value={mine} onChange={(e) => setMine(e.target.value)} />
      </label>
      {count > 0 && <p className={s.ok}>{count} so far. Every extra one is a door you didn’t know was there.</p>}
      {show ? (
        <ul className={s.angles}>{w.ideas.map((x) => <li key={x}>{x}</li>)}</ul>
      ) : (
        <PixelButton variant="quiet" onClick={() => setShow(true)}>See a few more possibilities</PixelButton>
      )}
      <PixelButton variant="quiet" onClick={() => { setI((i + 1) % WHAT_ELSE.length); setMine(''); setShow(false); }}>Another observation</PixelButton>
    </section>
  );
}

// ---------------------------------------------------------------- Curiosity Garden
const TOPICS: Topic[] = ['Science', 'Psychology', 'Philosophy', 'History', 'Nature', 'Art', 'Literature', 'Technology'];

function CuriosityGarden() {
  const today = new Date();
  const dayKey = today.getFullYear() * 400 + today.getMonth() * 32 + today.getDate();
  const picks = usePicks('curiosity');
  return (
    <Shell title="Curiosity Garden" lede="Each bed grows a different kind of question. Today’s curiosity in every bed changes with the days. Nothing to keep up with, just something to pick if you fancy it.">
      {picks.items.length > 0 && (
        <>
          <p className={s.meta}>Picked for you</p>
          <ul className={s.beds} aria-label="Picked for you">
            {picks.items.map((p) => {
              const r = READS.find((x) => x.id === p.id);
              return r ? (
                <li key={p.id}>
                  <button type="button" className={`${s.bed} ${s.forYou}`} onClick={() => openRead(r.id)}>
                    <span className={s.meta}>{r.topic}</span>
                    <span className={s.bedTitle}>{r.title}</span>
                    <span className={s.because}>{p.reason}</span>
                  </button>
                </li>
              ) : null;
            })}
          </ul>
          <p className={s.meta}>Today in every bed</p>
        </>
      )}
      <ul className={s.beds}>
        {TOPICS.map((t, k) => {
          const pool = READS.filter((r) => r.topic === t);
          const r = pool[(dayKey + k) % pool.length];
          return (
            <li key={t}>
              <button type="button" className={s.bed} onClick={() => openRead(r.id)}>
                <span className={s.meta}>{t}</span>
                <span className={s.bedTitle}>{r.title}</span>
                <span className={s.hook}>{r.hook}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

export function SpaceOverlay() {
  const space = useWorld((st) => st.space);
  if (space === 'glasshouse') return <Glasshouse />;
  if (space === 'playground') return <Playground />;
  if (space === 'curiosity') return <CuriosityGarden />;
  return null;
}

// ---------------------------------------------------------------- NPC dialogue
export function DialogueBox() {
  const d = useWorld((st) => st.dialogue);
  const [line, setLine] = useState('');
  const [offerRead, setOfferRead] = useState<string | null>(null);
  const npc = d ? npcById(d.npc) : undefined;
  useEffect(() => {
    if (!npc) return;
    setLine(npc.greeting[Math.floor(Math.random() * npc.greeting.length)]);
    setOfferRead(null);
  }, [npc]);
  const close = () => useWorld.getState().set({ dialogue: null });
  useEscape(!!npc, close);
  if (!npc) return null;
  return (
    <PixelPanel className={s.dialogue} role="dialog" aria-label={`Talking with ${npc.name}`}>
      <div className={s.portrait} style={{ backgroundImage: `url('/assets/npc_${npc.id}.png')` }} aria-hidden="true" />
      <div className={s.talk}>
        <p className={s.name}>{npc.name} <small>{npc.role}</small></p>
        <p className={s.line}>{line}</p>
        <div className={s.row}>
          <PixelButton variant="quiet" onClick={() => { setLine(npc.about); setOfferRead(null); }}>What do you do here?</PixelButton>
          <PixelButton variant="quiet" onClick={() => { setLine(npc.curiosity.line); setOfferRead(npc.curiosity.read); }}>Got a curiosity for me?</PixelButton>
          <PixelButton variant="quiet" onClick={() => { setLine(npc.tips[Math.floor(Math.random() * npc.tips.length)]); setOfferRead(null); }}>Any tips?</PixelButton>
          {offerRead && <PixelButton onClick={() => { track('npc_curiosity', { item: offerRead }); openRead(offerRead); }}>Read it</PixelButton>}
          <PixelButton onClick={close}>Goodbye</PixelButton>
        </div>
      </div>
    </PixelPanel>
  );
}
