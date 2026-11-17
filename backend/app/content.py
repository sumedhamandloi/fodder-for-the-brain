"""The library, loaded from the same JSON the frontend uses, so both sides always agree."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from functools import lru_cache

DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "src", "features", "library", "reads.json")


@dataclass(frozen=True)
class Read:
    id: str
    title: str
    topic: str
    depth: str
    minutes: int
    hook: str
    body: tuple[str, ...]
    related: tuple[str, ...] = field(default_factory=tuple)


@lru_cache(maxsize=1)
def load_reads(path: str | None = None) -> list[Read]:
    with open(path or os.environ.get("FODDER_CONTENT", DEFAULT_PATH), encoding="utf-8") as f:
        raw = json.load(f)
    return [
        Read(id=r["id"], title=r["title"], topic=r["topic"], depth=r["depth"], minutes=r["minutes"], hook=r["hook"],
             body=tuple(r["body"]), related=tuple(r.get("related", [])))
        for r in raw
    ]
