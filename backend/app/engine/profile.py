"""
STEP 2 — SIGNALS → A PERSONAL MODEL (your Curiosity Map).

ML CONCEPT · Implicit feedback
    Nobody rates reads 1–5 stars here (that would feel like homework). Instead we learn from what people *do*:
    opening a read, finishing it, saving it, following a thought from one read to another. These are *implicit*
    signals: noisy (you might open something by accident) but plentiful. Each gets a weight reflecting how
    strongly it suggests genuine interest. Saving says much more than opening.

ML CONCEPT · Exponential decay (recency weighting)
    Interests drift. A save from last week should count more than one from last year. Each signal is multiplied
    by 0.5 ** (age_days / HALF_LIFE_DAYS), so its influence halves every 45 days. This is the "soft fading"
    from the README: nothing is deleted, older signals just whisper instead of speak.

ML CONCEPT · Content-based filtering (the Rocchio / centroid method)
    Your *interest vector* is the weighted average of the vectors of the reads you engaged with. It lives in the
    same space as the reads, so "how much might you like read X?" becomes "how close is X to your interest
    vector?": one cosine similarity. It needs no other users at all, which suits a private, single-player app.
    (Collaborative filtering, "people like you also liked…", needs many users and would leak behaviour
    between people, so we deliberately don't use it.)

ML CONCEPT · Bayesian smoothing with a Beta prior (and the cold-start problem)
    Topic affinity asks: "when this person is shown a Philosophy read, how often do they engage?" With very few
    observations a raw ratio is wild: one save out of one view = 100%. So we start from a *prior belief*,
    Beta(α=1, β=1) meaning "no idea, 50/50", and update it with evidence:
        engaged signals add to α, exposures without engagement add to β.
    The posterior mean α/(α+β) is a sensible estimate even after one interaction, and grows confident as
    evidence piles up. Starting from a prior is how we handle *cold start*: brand-new users get gentle,
    neutral guesses (nudged by the topics they picked at onboarding) instead of extreme ones.

ML CONCEPT · Context: learning *when*, not just *what*
    Depth preference (short read vs deep dive) is tracked per time of day with its own Beta. Many people want
    a quick read in the morning and a long one in the evening; the model can pick that up.
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np

from .features import ItemSpace

HALF_LIFE_DAYS = 45.0

# How much each action suggests real interest in an item (implicit feedback weights).
SIGNAL_WEIGHT = {
    "open": 0.2,  # curious enough to look
    "finish": 0.6,  # read to the end
    "save": 1.0,  # strongest: "I want to keep this"
    "unsave": -0.8,  # changed their mind: pull back most of the save
    "follow_to": 0.5,  # followed a thought *into* this read
    "npc_curiosity": 0.3,  # took a neighbour's suggestion
}
ENGAGED = {"finish", "save", "follow_to"}  # counts as a "success" for topic affinity


@dataclass
class Event:
    kind: str
    item: str | None = None
    to: str | None = None
    value: str | None = None
    phase: str | None = None
    at: float = field(default_factory=time.time)


@dataclass
class Profile:
    interest: np.ndarray | None  # interest vector in item space (None until there's any signal)
    item_weight: dict[str, float]  # decayed engagement per item ("what you've touched")
    topic_alpha: dict[str, float]
    topic_beta: dict[str, float]
    depth: dict[str, tuple[float, float]]  # phase -> (alpha_deep, beta_deep)
    seen: set[str]
    saved: set[str]
    n_events: int

    def topic_affinity(self, topic: str) -> float:
        a, b = self.topic_alpha.get(topic, 1.0), self.topic_beta.get(topic, 1.0)
        return a / (a + b)

    def topic_confidence(self, topic: str) -> float:
        """How much evidence backs the affinity: 0 = prior only, →1 with lots of signals."""
        n = self.topic_alpha.get(topic, 1.0) + self.topic_beta.get(topic, 1.0) - 2.0
        return n / (n + 5.0)

    def prefers_deep(self, phase: str | None) -> float:
        a, b = self.depth.get(phase or "any", self.depth.get("any", (1.0, 1.0)))
        return a / (a + b)


def decay(age_seconds: float) -> float:
    return 0.5 ** (max(0.0, age_seconds) / 86400.0 / HALF_LIFE_DAYS)


def build_profile(events: list[Event], space: ItemSpace, interests: list[str] | None = None, now: float | None = None) -> Profile:
    now = now or time.time()
    item_w: dict[str, float] = defaultdict(float)
    alpha: dict[str, float] = defaultdict(lambda: 1.0)  # Beta(1,1) prior for every topic
    beta: dict[str, float] = defaultdict(lambda: 1.0)
    depth: dict[str, list[float]] = defaultdict(lambda: [1.0, 1.0])
    seen: set[str] = set()
    saved: set[str] = set()

    # onboarding topics act as a gentle head start (worth about one save each)
    for t in interests or []:
        alpha[t] += 1.0

    for e in sorted(events, key=lambda e: e.at):
        d = decay(now - e.at)
        if e.kind == "depth" and e.value in ("short", "deep"):
            for key in (e.phase or "any", "any"):
                depth[key][0 if e.value == "deep" else 1] += d
            continue
        target = e.to if e.kind == "follow" else e.item
        kind = "follow_to" if e.kind == "follow" else e.kind
        if not target or target not in space.ids:
            continue
        w = SIGNAL_WEIGHT.get(kind, 0.0)
        item_w[target] += w * d
        topic = space.topics[space.index(target)]
        if kind == "open":
            seen.add(target)
            beta[topic] += 0.25 * d  # an exposure; it only counts against the topic if nothing more follows
        if kind in ENGAGED:
            alpha[topic] += w * d
            beta[topic] = max(1.0, beta[topic] - 0.25 * d)  # the open turned into engagement: undo its exposure
            # reading a deep dive to the end is also evidence about depth preference
            if kind in ("finish", "save"):
                dk = space.depths[space.index(target)]
                for key in (e.phase or "any", "any"):
                    depth[key][0 if dk == "deep" else 1] += 0.5 * d
        if kind == "save":
            saved.add(target)
        if kind == "unsave":
            saved.discard(target)

    # the interest vector: weighted centroid of everything with positive engagement
    pos = {i: w for i, w in item_w.items() if w > 0}
    interest = None
    if pos:
        idx = [space.index(i) for i in pos]
        weights = np.array(list(pos.values()))[:, None]
        v = (space.vectors[idx] * weights).sum(axis=0)
        interest = v / (np.linalg.norm(v) + 1e-12)

    return Profile(
        interest=interest, item_weight=dict(item_w), topic_alpha=dict(alpha), topic_beta=dict(beta),
        depth={k: (v[0], v[1]) for k, v in depth.items()}, seen=seen, saved=saved, n_events=len(events),
    )
