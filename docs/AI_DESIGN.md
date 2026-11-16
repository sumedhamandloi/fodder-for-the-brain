# AI Design: The Curiosity Engine. Draft, implemented in Milestone 9

## Principles
- **Optional.** The app is complete without an API key, using curated content.
- **Grounded.** The AI transforms **sourced** material and never invents facts. Every output keeps its citations.
- **Finite.** At most 3 suggestions per request, and nothing auto-refreshes.
- **Private.** Journals and location are never sent without explicit, per-action consent.

## Modules (`backend/app/ai/`)
```
providers/base.py      LLMProvider protocol: complete(messages, schema) -> pydantic model
providers/anthropic.py, providers/openai_compat.py, providers/none.py (curated fallback)
retrieval.py           keyword + topic filter now; pgvector similarity later
curator.py             Curiosity Curator: (topics, depth, mood) → retrieve candidates → rank → ≤3
lens.py                Fodder Lens: content + sources → simple | analogy | short | deep | questions
follow.py              Follow the Thought: concept → 3 directions (each tied to a content item when one exists)
guardrails.py          citation preservation check, length limits, banned-pattern filter
```
Provider and model are chosen by environment variable (`FODDER_LLM_PROVIDER`, `FODDER_LLM_MODEL`). The default suggestion is a current Claude model.

## The growing graph (Idea Graph + Curiosity Map)
- **Idea Graph (shared):** nodes are `content_items`; edges are hand-curated `related` links plus pgvector nearest neighbours (`content_embeddings`). Edges carry a `source` field: `curated` or `semantic`.
- **Curiosity Map (per user, RLS):** `curiosity_weights(user_id, node_id, weight, updated_at)` and `curiosity_edges(user_id, from_id, to_id, weight, updated_at)`.
  - Signals: read finished (+0.2), saved (+1.0), follow-the-thought A→B (edge +0.5), depth choice (preference vector), onboarding interests (seed weights).
  - Soft fading: `weight × 0.5^(days/45)`, computed on read, never by cron. Fading changes only suggestions; nothing saved is removed.
  - **Journals are never a signal** unless the writer opts in per entry (`ai_consent`).
- **Ranking (Curator):** `score = Σ map weight of node and neighbours × depth fit × mood fit + novelty bonus` (one of three slots is reserved for a weakly connected "unexpected" node). Always at most 3 results, each with a `because` explanation.
- **Growth at the edges:** when a user's map has strong weight on a region with few nodes, the engine proposes a new branch. It retrieves reputable sources, runs the Lens (citations preserved), and stores the result as `content_items.status = 'proposed'`. Proposed items are labelled AI-assisted and reviewed before joining the shared graph.
- **User control:** view the map (rendered as the Mind Garden), remove nodes or topics, reset the whole map, turn AI off entirely.

## Evaluation
- Golden set of about 30 content items with expected lens outputs. Tests check that citations survive and that output is at most N words.
- `none` provider tests make sure every endpoint works with no key.
