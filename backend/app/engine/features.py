"""
STEP 1 — FEATURES: turning reads into numbers.

ML CONCEPT · Feature vectors
    Models can't read prose, so each library read becomes a list of numbers (a *vector*). Reads about
    similar things should end up with similar vectors. Everything else in the engine works on these vectors.

ML CONCEPT · TF-IDF (term frequency × inverse document frequency)
    For every word, TF-IDF asks two questions:
      * TF  — how often does this word appear in *this* read?        ("tardigrades" appears a lot in one piece)
      * IDF — how rare is this word across *all* reads?               ("the" is everywhere, so it's worth ~0)
    Multiplying them gives high scores to words that are distinctive for a read. A read's vector is its
    TF-IDF score for every word in the vocabulary (mostly zeros, so it's stored "sparse").

ML CONCEPT · Cosine similarity
    To compare two reads we measure the angle between their vectors: cos = (a·b) / (|a||b|).
    1.0 means "pointing the same way" (same subject), 0 means "nothing in common". Because we L2-normalise every
    vector (scale it to length 1), cosine similarity is just a dot product, which is fast.

ML CONCEPT · Hand-crafted features alongside learned ones
    Text alone misses structure we already know, so we append a one-hot topic block (e.g. [0,0,1,0,…] for
    "Philosophy"), scaled by TOPIC_WEIGHT. This nudges reads of the same topic closer together. Choosing and
    weighting features like this is called *feature engineering*.

ML CONCEPT · The Idea Graph (a similarity graph)
    Computing cosine similarity for every pair of reads gives an N×N matrix. Treat each read as a node and
    connect it to its most similar neighbours: that's the shared Idea Graph from the README. Later, pgvector
    can store these vectors in Postgres and find neighbours at scale; with 13 reads, numpy is plenty.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from ..content import Read

TOPIC_WEIGHT = 0.35  # how strongly "same topic" pulls reads together, relative to the text


@dataclass
class ItemSpace:
    ids: list[str]
    topics: list[str]
    depths: list[str]
    vectors: np.ndarray  # (n_items, n_features), each row L2-normalised
    similarity: np.ndarray  # (n_items, n_items) cosine similarity — the Idea Graph's edge weights
    curated_edges: set[tuple[str, str]]  # hand-written "related" links, kept as trusted edges

    def index(self, item_id: str) -> int:
        return self.ids.index(item_id)

    def neighbours(self, item_id: str, k: int = 5) -> list[tuple[str, float]]:
        i = self.index(item_id)
        order = np.argsort(-self.similarity[i])
        return [(self.ids[j], float(self.similarity[i, j])) for j in order if j != i][:k]


def build_item_space(reads: list[Read]) -> ItemSpace:
    docs = [f"{r.title}. {r.hook} " + " ".join(p for p in r.body if not p.startswith("## ")) for r in reads]
    # sublinear_tf: a word appearing 10× isn't 10× as important (log scaling). English stop words ("the", "and") are dropped.
    tfidf = TfidfVectorizer(stop_words="english", sublinear_tf=True, min_df=1, ngram_range=(1, 2), max_features=5000)
    text = tfidf.fit_transform(docs).toarray()

    topics = sorted({r.topic for r in reads})
    onehot = np.zeros((len(reads), len(topics)))
    for i, r in enumerate(reads):
        onehot[i, topics.index(r.topic)] = 1.0

    x = np.hstack([text, TOPIC_WEIGHT * onehot])
    x /= np.linalg.norm(x, axis=1, keepdims=True) + 1e-12  # L2 normalise → cosine == dot product

    sim = x @ x.T
    curated = {(r.id, rel) for r in reads for rel in r.related}
    # trust the hand-curated links: give them a floor so they always count as close neighbours
    for a, b in curated:
        ia, ib = [r.id for r in reads].index(a), [r.id for r in reads].index(b)
        sim[ia, ib] = sim[ib, ia] = max(sim[ia, ib], 0.35)

    return ItemSpace(
        ids=[r.id for r in reads],
        topics=[r.topic for r in reads],
        depths=[r.depth for r in reads],
        vectors=x,
        similarity=sim,
        curated_edges=curated,
    )
