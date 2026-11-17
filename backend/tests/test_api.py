import os
import tempfile
import uuid

os.environ["FODDER_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)
GUEST = {"X-Fodder-Guest": str(uuid.uuid4())}


def test_health():
    assert client.get("/api/v1/health").json() == {"ok": True}


def test_identity_is_required():
    assert client.get("/api/v1/recommendations").status_code == 401


def test_learn_then_recommend_then_forget():
    r = client.post("/api/v1/events", headers=GUEST, json={"events": [
        {"kind": "open", "item": "octopus-arms", "phase": "morning"},
        {"kind": "finish", "item": "octopus-arms", "phase": "morning"},
        {"kind": "save", "item": "octopus-arms", "phase": "morning"},
        {"kind": "follow", "item": "octopus-arms", "to": "tardigrades"},
    ]})
    assert r.status_code == 204

    recs = client.get("/api/v1/recommendations", headers=GUEST, params={"surface": "library", "phase": "morning"}).json()
    assert 1 <= len(recs) <= 3
    assert "octopus-arms" not in [x["id"] for x in recs]
    assert all(x["reason"] for x in recs)

    prof = client.get("/api/v1/profile", headers=GUEST).json()
    nature = next(t for t in prof["topics"] if t["topic"] == "Nature")
    assert nature["affinity"] > 0.5
    assert prof["events"] == 4

    assert client.delete("/api/v1/profile", headers=GUEST).status_code == 204
    assert client.get("/api/v1/profile", headers=GUEST).json()["events"] == 0


def test_follow_surface():
    recs = client.get("/api/v1/recommendations", headers=GUEST, params={"surface": "follow", "item": "blue-sky"}).json()
    assert 1 <= len(recs) <= 3 and "blue-sky" not in [x["id"] for x in recs]


def test_unknown_event_kinds_are_rejected():
    r = client.post("/api/v1/events", headers=GUEST, json={"events": [{"kind": "journal_text", "value": "secret"}]})
    assert r.status_code == 422
