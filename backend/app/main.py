"""Fodder for the Brain — learning engine API.

    uvicorn app.main:app --reload --port 8000      (from backend/, inside the venv)
"""
from __future__ import annotations

import os
import random
import time
from functools import lru_cache
from typing import Literal

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import store
from .auth import current_user
from .content import load_reads
from .engine.features import ItemSpace, build_item_space
from .engine.profile import Event, build_profile
from .engine.ranker import recommend

app = FastAPI(title="Fodder Learning Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("FODDER_ALLOWED_ORIGINS", "http://localhost:5173").split(",")],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Fodder-Guest"],
)


@lru_cache(maxsize=1)
def model() -> tuple[ItemSpace, dict]:
    reads = load_reads()
    return build_item_space(reads), {r.id: r for r in reads}


class EventIn(BaseModel):
    kind: Literal["open", "finish", "save", "unsave", "follow", "depth", "npc_curiosity"]
    item: str | None = Field(default=None, max_length=80)
    to: str | None = Field(default=None, max_length=80)
    value: str | None = Field(default=None, max_length=20)
    phase: Literal["dawn", "morning", "afternoon", "sunset", "evening", "night"] | None = None
    at: float | None = None


class EventsIn(BaseModel):
    events: list[EventIn] = Field(max_length=200)
    interests: list[str] = Field(default_factory=list, max_length=8)


class SuggestionOut(BaseModel):
    id: str
    reason: str
    kind: str


@app.get("/api/v1/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/v1/events", status_code=204)
def post_events(body: EventsIn, user: str = Depends(current_user)) -> None:
    now = time.time()
    store.add_events(user, [Event(kind=e.kind, item=e.item, to=e.to, value=e.value, phase=e.phase, at=e.at or now) for e in body.events])


@app.get("/api/v1/recommendations", response_model=list[SuggestionOut])
def recommendations(
    surface: Literal["library", "curiosity", "follow"] = "library",
    item: str | None = None,
    phase: str | None = None,
    interests: list[str] = Query(default=[]),
    user: str = Depends(current_user),
) -> list[SuggestionOut]:
    space, reads = model()
    profile = build_profile(store.get_events(user), space, interests)
    anchor = item if surface == "follow" and item in reads else None
    # seed per user and day: suggestions stay put during a visit instead of reshuffling on every look
    rng = random.Random(f"{user}:{time.strftime('%Y-%m-%d')}:{surface}:{item}")
    return [SuggestionOut(id=s.id, reason=s.reason, kind=s.kind) for s in recommend(space, reads, profile, phase=phase, anchor=anchor, rng=rng)]


@app.get("/api/v1/profile")
def get_profile(user: str = Depends(current_user)) -> dict:
    """Transparency: exactly what the engine believes about you, in plain terms."""
    space, reads = model()
    p = build_profile(store.get_events(user), space)
    topics = sorted({t for t in space.topics})
    return {
        "events": p.n_events,
        "topics": [
            {"topic": t, "affinity": round(p.topic_affinity(t), 3), "confidence": round(p.topic_confidence(t), 3)} for t in topics
        ],
        "prefers_deep": round(p.prefers_deep(None), 3),
        "closest_reads": [
            {"id": space.ids[i], "title": reads[space.ids[i]].title}
            for i in (sorted(range(len(space.ids)), key=lambda i: -float(space.vectors[i] @ p.interest))[:3] if p.interest is not None else [])
        ],
    }


@app.delete("/api/v1/profile", status_code=204)
def delete_profile(user: str = Depends(current_user)) -> None:
    """Forget everything the engine has learned about you."""
    store.forget(user)
