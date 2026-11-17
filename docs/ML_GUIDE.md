# The Learning Engine: a guided tour

Fodder's learning engine (`backend/app/engine/`) learns what *you* enjoy from gentle signals and uses it to choose **at most three** suggestions, each with a reason. Every file opens with plain-language notes on the ML idea it uses. This page is the map.

```
 reads.json ──► features.py ──► Idea Graph (item vectors + similarity)
                                     │
 your actions ─► profile.py ──► Curiosity Map (interest vector, topic beliefs, depth habits)
                                     │
                    ranker.py ──► ≤ 3 suggestions + reasons   ──► library desk, Curiosity Garden, Follow the thought
                                     │
                  evaluate.py ──► "is it better than random?" (offline test on simulated readers)
```

| Step | Concept | In one sentence | File |
|---|---|---|---|
| 1 | **Feature vectors** | Each read becomes a list of numbers so a computer can compare reads. | `features.py` |
| 1 | **TF-IDF** | Words that are frequent in one read but rare overall describe that read best. | `features.py` |
| 1 | **Cosine similarity** | Two reads are alike if their vectors point the same way. | `features.py` |
| 1 | **Feature engineering** | We add the topic as an extra, hand-chosen feature. | `features.py` |
| 2 | **Implicit feedback** | We learn from what you do (open, finish, save, follow), not from ratings. | `profile.py` |
| 2 | **Exponential decay** | A signal's influence halves every 45 days, so the map reflects who you are now. | `profile.py` |
| 2 | **Content-based filtering** | Your interest vector is the weighted average of reads you engaged with; similar reads score high. | `profile.py` |
| 2 | **Bayesian smoothing (Beta prior)** | Start from "50/50, no idea" and let evidence move the estimate, so one click never swings it wildly. | `profile.py` |
| 2 | **Cold start** | New people get neutral guesses, nudged by onboarding topics. | `profile.py` |
| 2 | **Context** | Depth preference is learned per time of day. | `profile.py` |
| 3 | **Weighted scoring** | Blend relevance, topic affinity and depth fit into one score. | `ranker.py` |
| 3 | **Exploration vs exploitation / Thompson sampling** | One slot goes to a topic you might like but we're unsure about, so your world can grow. | `ranker.py` |
| 3 | **MMR diversity** | Don't suggest three versions of the same thing. | `ranker.py` |
| 3 | **Explainability** | Each pick says why ("because you saved…"). | `ranker.py` |
| 4 | **Baselines, simulated users, Hit Rate@3** | Measure the engine against random and popularity before trusting it. | `evaluate.py` |

### Current results
`python -m app.engine.evaluate` on 300 simulated readers:

| Strategy | Hit Rate@3 |
|---|---|
| Learning engine | **0.769** |
| Popularity baseline | 0.513 |
| Random baseline | 0.470 |

### Why these choices (and not others)
- **No collaborative filtering** ("people like you liked…"). It needs many users, mixes people's behaviour together, and isn't needed for a private, single-player world. Content-based learning works from day one with one person.
- **No deep learning yet.** With 13 reads, a big model would just memorise. TF-IDF plus Bayesian beliefs is fast, explainable and testable. When the library grows, the planned upgrade path is sentence embeddings stored in **pgvector**, with the same ranker on top.
- **Hard product rules beat tuning.** "At most three", "explain every pick", "one exploration slot", and "journals are never a signal" are enforced in code, not left to the model.

### Privacy
Stored: user id (or a random guest id), action kind, content id, time-of-day phase, timestamp. **Never** journal text or location. Anyone can view what the engine believes (*Your Little World → What has Fodder learned?*), switch learning off, or **Forget it all** (`DELETE /api/v1/profile`).

### Try it
```bash
cd backend
python -m venv .venv && .venv/Scripts/activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
pytest -q                                            # 15 tests, including "beats the baselines"
python -m app.engine.evaluate                        # the offline experiment
uvicorn app.main:app --reload --port 8000            # the API; set VITE_API_URL=http://localhost:8000 in frontend/.env.local
```
For signed-in players, set `SUPABASE_JWT_SECRET` (Supabase → Settings → API → JWT secret) so the API can verify their sessions.
