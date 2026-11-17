"""
STEP 3 — CHOOSING AT MOST THREE THINGS TO SUGGEST.

ML CONCEPT · Scoring = a weighted blend of signals
    For every candidate read we compute a score from several "experts":
      relevance = cosine(your interest vector, the read)     ← content-based filtering
      topic     = your Bayesian topic affinity                ← how this kind of subject goes for you
      depth fit = how well short/deep matches your habits right now
    and blend them with weights. Real recommenders learn these weights from data (learning-to-rank); with a
    tiny library we set them by hand and check them in the offline evaluation (evaluate.py).

ML CONCEPT · Exploration vs exploitation (multi-armed bandits, Thompson sampling)
    If we only ever suggest what we're confident you like (*exploitation*), your map can never grow: a filter
    bubble. So one of the three slots is reserved for *exploration*. We treat each topic like a slot machine
    ("arm") with an unknown payout, and use **Thompson sampling**: draw a random plausible affinity from each
    topic's Beta posterior and pick the highest draw. Topics we know little about have wide, uncertain
    posteriors, so they sometimes draw high and get a turn. As evidence accumulates, the draws settle down.
    This is the "one deliberately unexpected branch" from the README, chosen in a principled way.

ML CONCEPT · Diversity with Maximal Marginal Relevance (MMR)
    The top three by score might all be about the same thing. MMR picks items one at a time, each time choosing
    the item that best balances "relevant to you" against "different from what's already picked":
        MMR = λ · relevance − (1 − λ) · max similarity to already-chosen items

ML CONCEPT · Explainability
    Every suggestion carries a reason ("because you saved …"), found by asking which item you engaged with is
    closest in the Idea Graph. Explanations keep the system honest and let people correct it.
"""
from __future__ import annotations

import random
from dataclasses import dataclass

import numpy as np

from ..content import Read
from .features import ItemSpace
from .profile import Profile

MAX_SUGGESTIONS = 3  # a product rule, not a tuning knob: never more than three
W_REL, W_TOPIC, W_DEPTH = 0.6, 0.3, 0.1
MMR_LAMBDA = 0.7


@dataclass
class Suggestion:
    id: str
    score: float
    reason: str
    kind: str  # "for_you" | "explore" | "starter"


def _depth_fit(profile: Profile, depth: str, phase: str | None) -> float:
    p_deep = profile.prefers_deep(phase)
    return p_deep if depth == "deep" else 1.0 - p_deep


def _reason(profile: Profile, space: ItemSpace, reads: dict[str, Read], item: str) -> str:
    touched = [(i, w) for i, w in profile.item_weight.items() if w > 0 and i != item]
    if touched:
        i = space.index(item)
        best = max(touched, key=lambda t: space.similarity[i, space.index(t[0])] * (1.5 if t[0] in profile.saved else 1.0))
        verb = "saved" if best[0] in profile.saved else "enjoyed"
        return f"Because you {verb} “{reads[best[0]].title}”"
    return f"Because you’re curious about {reads[item].topic.lower()}"


def recommend(
    space: ItemSpace,
    reads: dict[str, Read],
    profile: Profile,
    phase: str | None = None,
    anchor: str | None = None,
    k: int = MAX_SUGGESTIONS,
    rng: random.Random | None = None,
) -> list[Suggestion]:
    """`anchor`: when following a thought from a read, candidates are that read's Idea Graph neighbours."""
    rng = rng or random.Random()
    k = min(k, MAX_SUGGESTIONS)
    n = len(space.ids)
    exclude = set(profile.saved) | ({anchor} if anchor else set())
    if not anchor:
        # don't re-suggest what you've already finished or saved
        exclude |= {i for i, w in profile.item_weight.items() if w >= 0.6}
    cands = [i for i in range(n) if space.ids[i] not in exclude]
    if anchor:
        a = space.index(anchor)
        cands = sorted(cands, key=lambda i: -space.similarity[a, i])[:6]
    if not cands:
        return []

    # ---- score every candidate
    rel = np.array([float(space.vectors[i] @ profile.interest) if profile.interest is not None else 0.0 for i in cands])
    if anchor:
        rel = 0.5 * rel + 0.5 * np.array([space.similarity[space.index(anchor), i] for i in cands])
    topic = np.array([profile.topic_affinity(space.topics[i]) for i in cands])
    depth = np.array([_depth_fit(profile, space.depths[i], phase) for i in cands])
    score = W_REL * rel + W_TOPIC * topic + W_DEPTH * depth

    # ---- exploration slot (Thompson sampling over topics), only once there's something to explore from
    explore_pick: int | None = None
    if profile.n_events >= 3 and k == 3 and not anchor:
        topics = sorted({space.topics[i] for i in cands})
        draws = {t: rng.betavariate(profile.topic_alpha.get(t, 1.0), profile.topic_beta.get(t, 1.0)) for t in topics}
        # favour topics we're *uncertain* about: rank by draw, but skip the user's current top topic
        top_topic = max(topics, key=profile.topic_affinity)
        for t in sorted(draws, key=draws.get, reverse=True):
            if t != top_topic:
                pool = [j for j, i in enumerate(cands) if space.topics[i] == t]
                explore_pick = max(pool, key=lambda j: score[j])
                break

    # ---- MMR re-ranking for the "for you" slots
    chosen: list[int] = [] if explore_pick is None else [explore_pick]
    slots = k - len(chosen)
    while slots > 0 and len(chosen) < len(cands):
        best, best_val = None, -1e9
        for j in range(len(cands)):
            if j in chosen:
                continue
            redundancy = max((space.similarity[cands[j], cands[c]] for c in chosen), default=0.0)
            val = MMR_LAMBDA * score[j] - (1 - MMR_LAMBDA) * redundancy
            if val > best_val:
                best, best_val = j, val
        chosen.insert(len(chosen) - (1 if explore_pick is not None else 0), best)  # keep the explore pick last
        slots -= 1

    out = []
    for j in chosen:
        item = space.ids[cands[j]]
        if j == explore_pick:
            out.append(Suggestion(item, float(score[j]), f"Something a little different: {reads[item].topic.lower()}", "explore"))
        else:
            kind = "for_you" if profile.n_events else "starter"
            out.append(Suggestion(item, float(score[j]), _reason(profile, space, reads, item), kind))
    return out
