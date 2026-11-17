import random

import numpy as np

from app.content import load_reads
from app.engine.evaluate import simulate
from app.engine.features import build_item_space
from app.engine.profile import Event, build_profile, decay
from app.engine.ranker import MAX_SUGGESTIONS, recommend

READS = load_reads()
SPACE = build_item_space(READS)
BY_ID = {r.id: r for r in READS}
T0 = 1_700_000_000.0


def test_vectors_are_unit_length_and_similar_reads_are_close():
    assert np.allclose(np.linalg.norm(SPACE.vectors, axis=1), 1.0)
    # a hand-curated pair should be closer than an unrelated pair
    i, j = SPACE.index("ship-of-theseus"), SPACE.index("dichotomy-of-control")
    k = SPACE.index("tardigrades")
    assert SPACE.similarity[i, j] > SPACE.similarity[i, k]


def test_decay_halves_every_45_days():
    assert abs(decay(45 * 86400) - 0.5) < 1e-9
    assert decay(0) == 1.0


def test_cold_start_profile_is_neutral():
    p = build_profile([], SPACE)
    assert p.interest is None
    assert p.topic_affinity("Philosophy") == 0.5  # Beta(1,1) prior: no opinion yet


def test_onboarding_interests_give_a_gentle_head_start():
    p = build_profile([], SPACE, interests=["Nature"])
    assert 0.5 < p.topic_affinity("Nature") < 0.8


def test_saves_raise_topic_affinity_and_shape_interest():
    ev = [Event("open", "ship-of-theseus", at=T0), Event("finish", "ship-of-theseus", at=T0 + 60), Event("save", "ship-of-theseus", at=T0 + 90)]
    p = build_profile(ev, SPACE, now=T0 + 100)
    assert p.topic_affinity("Philosophy") > p.topic_affinity("Art")
    assert "ship-of-theseus" in p.saved
    # the interest vector points at what was saved
    closest = max(SPACE.ids, key=lambda i: float(SPACE.vectors[SPACE.index(i)] @ p.interest))
    assert closest == "ship-of-theseus"


def test_unsave_takes_it_back():
    ev = [Event("save", "serendipity", at=T0), Event("unsave", "serendipity", at=T0 + 5)]
    p = build_profile(ev, SPACE, now=T0 + 10)
    assert "serendipity" not in p.saved


def test_never_more_than_three_and_never_already_saved():
    ev = [Event("save", "tardigrades", at=T0), Event("finish", "octopus-arms", at=T0 + 10), Event("open", "blue-sky", at=T0 + 20)]
    p = build_profile(ev, SPACE, now=T0 + 30)
    recs = recommend(SPACE, BY_ID, p, rng=random.Random(1))
    assert 1 <= len(recs) <= MAX_SUGGESTIONS
    assert "tardigrades" not in {r.id for r in recs}
    assert all(r.reason for r in recs)
    assert len({r.id for r in recs}) == len(recs)


def test_exploration_slot_offers_something_different():
    ev = [Event(k, "ship-of-theseus", at=T0 + n) for n, k in enumerate(["open", "finish", "save"])]
    ev += [Event(k, "dichotomy-of-control", at=T0 + 10 + n) for n, k in enumerate(["open", "finish", "save"])]
    p = build_profile(ev, SPACE, now=T0 + 100)
    recs = recommend(SPACE, BY_ID, p, rng=random.Random(3))
    explore = [r for r in recs if r.kind == "explore"]
    assert len(explore) == 1
    assert BY_ID[explore[0].id].topic != "Philosophy"


def test_follow_the_thought_stays_near_the_anchor():
    p = build_profile([], SPACE)
    recs = recommend(SPACE, BY_ID, p, anchor="wood-wide-web", rng=random.Random(0))
    near = {i for i, _ in SPACE.neighbours("wood-wide-web", k=6)}
    assert recs and all(r.id in near for r in recs)


def test_engine_beats_baselines_on_simulated_readers():
    res = simulate(n_users=200, seed=11)
    assert res["engine"] > res["random"]
    assert res["engine"] > res["popularity"]
