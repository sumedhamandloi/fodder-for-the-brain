import { useState } from 'react';
import { PixelButton } from '../../ui/Pixel';
import { useWorld } from '../../state/world';
import { fetchProfile, forgetMe, learningAvailable, LearnedProfile } from '../../services/learning';
import s from './Learned.module.css';

/** Your Curiosity Map, in plain view: what the engine believes, how sure it is, and the controls to change it. */
export function LearnedSection() {
  const learning = useWorld((st) => st.learning);
  const [profile, setProfile] = useState<LearnedProfile | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'forgotten' | 'offline'>('idle');

  if (!learningAvailable)
    return <p className={s.note}>Suggestions are hand-picked for now. The learning engine isn’t connected on this build.</p>;

  const look = async () => {
    setState('loading');
    try {
      const p = await fetchProfile();
      setProfile(p);
      setState(p ? 'idle' : 'offline');
    } catch {
      setState('offline');
    }
  };
  const forget = async () => {
    if (!window.confirm('Forget everything Fodder has learned about what you enjoy? Your saved ideas and journal stay.')) return;
    await forgetMe().catch(() => undefined);
    setProfile(null);
    setState('forgotten');
  };

  const topics = profile?.topics.slice().sort((a, b) => b.affinity - a.affinity) ?? [];
  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <PixelButton variant="quiet" aria-pressed={learning} onClick={() => useWorld.getState().set({ learning: !learning })}>
          Learn what I enjoy
        </PixelButton>
        {learning && <PixelButton variant="quiet" onClick={look}>What has Fodder learned?</PixelButton>}
        <PixelButton variant="quiet" onClick={forget}>Forget it all</PixelButton>
      </div>
      <p className={s.note}>
        Fodder notices what you open, finish, save and follow, never your journal or location, and uses it to pick at most three
        suggestions, each with its reason.
      </p>
      {state === 'loading' && <p className={s.note}>Looking…</p>}
      {state === 'offline' && <p className={s.note}>The learning engine is resting right now. Suggestions stay hand-picked.</p>}
      {state === 'forgotten' && <p className={s.note}>Done. Fodder is starting fresh, like the first day.</p>}
      {profile && (
        <div className={s.map} aria-label="What Fodder has learned">
          {profile.events === 0 ? (
            <p className={s.note}>Nothing yet. Wander the library and it’ll start to notice what you like.</p>
          ) : (
            <>
              <ul className={s.topics}>
                {topics.map((t) => (
                  <li key={t.topic}>
                    <span className={s.topic}>{t.topic}</span>
                    <span className={s.bar} aria-hidden="true">
                      <span className={s.fill} style={{ width: `${Math.round(t.affinity * 100)}%`, opacity: 0.45 + 0.55 * t.confidence }} />
                    </span>
                    <span className={s.sure}>{t.confidence < 0.2 ? 'just a hunch' : t.confidence < 0.5 ? 'fairly sure' : 'confident'}</span>
                  </li>
                ))}
              </ul>
              <p className={s.note}>
                You lean towards {profile.prefers_deep >= 0.5 ? 'deep dives' : 'short reads'}.
                {profile.closest_reads.length > 0 && <> Closest to your interests: {profile.closest_reads.map((r) => `“${r.title}”`).join(', ')}.</>}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
