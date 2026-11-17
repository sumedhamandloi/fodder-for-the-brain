"""
STEP 4 — DOES IT ACTUALLY WORK? Offline evaluation.

ML CONCEPT · Never trust a model you haven't measured
    It's easy to build something that *sounds* smart and performs worse than a coin flip. So before any real
    person sees a suggestion, we test the engine against **baselines**, simple strategies any model must beat:
      * random      — suggest any three unseen reads
      * popularity  — suggest the reads most people engage with (here: deep dives first, a common heuristic)

ML CONCEPT · Simulated users (synthetic data)
    We don't have real users yet, and we wouldn't use their private data for testing anyway. So we simulate
    readers with *hidden* tastes: each simulated person secretly loves 1–2 topics and a depth. They wander the
    library, engaging with reads they like more often than ones they don't (with noise, because people
    are noisy). The engine only sees their actions, never their hidden tastes.

ML CONCEPT · Train / test split and Hit Rate@3
    For each simulated person we let them interact for a while (the *training* history), then ask the engine for
    three suggestions and check whether they include something the person would genuinely love (the *test*).
    Hit Rate@3 = the fraction of people for whom at least one of the three suggestions was a hit. We average over
    many simulated people with a fixed random seed so results are reproducible.

Run it:  python -m app.engine.evaluate
"""
from __future__ import annotations

import random
import statistics

from ..content import load_reads
from .features import build_item_space
from .profile import Event, build_profile
from .ranker import recommend

TOPICS = ["Science", "Psychology", "Philosophy", "History", "Nature", "Art", "Literature", "Technology"]


def simulate(n_users: int = 300, history: int = 6, seed: int = 7) -> dict[str, float]:
    reads = load_reads()
    space = build_item_space(reads)
    by_id = {r.id: r for r in reads}
    rng = random.Random(seed)
    hits = {"engine": [], "random": [], "popularity": []}

    for _ in range(n_users):
        loves = set(rng.sample(TOPICS, rng.choice([1, 2])))
        likes_deep = rng.random() < 0.5
        lovable = {r.id for r in reads if r.topic in loves}
        if len(lovable) < 2:
            continue
        # --- training history: browse; engage strongly with loved topics, weakly otherwise
        events: list[Event] = []
        t = 1_000_000.0
        pool = [r.id for r in reads]
        for _ in range(history):
            # people tend to wander towards what they like (but not always)
            item = rng.choice(sorted(lovable)) if rng.random() < 0.6 else rng.choice(pool)
            t += 3600
            events.append(Event("open", item=item, at=t))
            liked = item in lovable
            if rng.random() < (0.8 if liked else 0.15):
                events.append(Event("finish", item=item, at=t + 60))
                if rng.random() < (0.6 if liked else 0.05):
                    events.append(Event("save", item=item, at=t + 90))
            if rng.random() < 0.3:
                events.append(Event("depth", value="deep" if likes_deep else "short", at=t))
        profile = build_profile(events, space, now=t + 3600)
        touched = {e.item for e in events if e.item}
        held_out = lovable - touched  # loved reads the person hasn't found yet: the "right answers"
        if not held_out:
            continue

        engine = [s.id for s in recommend(space, by_id, profile, rng=random.Random(rng.random()))]
        unseen = [i for i in space.ids if i not in touched]
        rnd = rng.sample(unseen, min(3, len(unseen)))
        popular = sorted(unseen, key=lambda i: (by_id[i].depth != "deep", i))[:3]
        for name, recs in (("engine", engine), ("random", rnd), ("popularity", popular)):
            hits[name].append(1.0 if held_out & set(recs) else 0.0)

    return {k: round(statistics.mean(v), 3) for k, v in hits.items() if v}


if __name__ == "__main__":
    res = simulate()
    print("Hit Rate@3 on simulated readers (higher is better):")
    for k, v in res.items():
        print(f"  {k:<11} {v:.3f}")
