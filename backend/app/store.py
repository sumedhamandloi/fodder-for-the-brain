"""Event storage. SQLite locally (zero setup); the same two tables can live in Supabase Postgres later.

Privacy: only content ids, action kinds and a coarse time-of-day phase are stored. Never journal text, never location.
"""
from __future__ import annotations

import os
import sqlite3
import threading
import time

from .engine.profile import Event

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None
VALID_KINDS = {"open", "finish", "save", "unsave", "follow", "depth", "npc_curiosity"}
MAX_EVENTS_PER_USER = 5000  # a bounded history: the model only needs recent behaviour


def conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        path = os.environ.get("FODDER_DB", os.path.join(os.path.dirname(__file__), "..", "fodder_learning.db"))
        _conn = sqlite3.connect(path, check_same_thread=False)
        _conn.executescript(
            """
            create table if not exists events (
              user_id text not null, kind text not null, item text, item_to text, value text, phase text, at real not null
            );
            create index if not exists events_user on events (user_id, at);
            """
        )
    return _conn


def add_events(user_id: str, events: list[Event]) -> int:
    rows = [(user_id, e.kind, e.item, e.to, e.value, e.phase, min(e.at, time.time())) for e in events if e.kind in VALID_KINDS]
    with _lock:
        c = conn()
        c.executemany("insert into events values (?,?,?,?,?,?,?)", rows)
        # keep only the most recent MAX_EVENTS_PER_USER
        c.execute(
            "delete from events where user_id=? and rowid not in (select rowid from events where user_id=? order by at desc limit ?)",
            (user_id, user_id, MAX_EVENTS_PER_USER),
        )
        c.commit()
    return len(rows)


def get_events(user_id: str) -> list[Event]:
    with _lock:
        rows = conn().execute("select kind,item,item_to,value,phase,at from events where user_id=? order by at", (user_id,)).fetchall()
    return [Event(kind=k, item=i, to=t, value=v, phase=p, at=a) for k, i, t, v, p, a in rows]


def forget(user_id: str) -> None:
    with _lock:
        conn().execute("delete from events where user_id=?", (user_id,))
        conn().commit()
