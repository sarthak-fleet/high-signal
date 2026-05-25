# HighSignal Lab

Local-first Postgres substrate for High Signal. Plan: `plans/0007-highsignal-lab-substrate.md`.

## Bring-up

```bash
# 1. Start Postgres (pgvector + pg_trgm), runs schema.sql on first boot.
docker compose -f python/lab/docker-compose.yml up -d

# 2. Install Python deps.
cd python/lab && uv sync

# 3. Ingest top 30 HN stories + extract the linked page text.
uv run python -m high_signal_lab.ingest --limit 30

# 4. Score documents (HN + recency + GitHub).
uv run python -m high_signal_lab.score

# 5. Serve the local API.
uv run python -m high_signal_lab.server --reload
# → http://localhost:8765/feed?limit=30
```

Wire the web app to it by setting `LAB_API_URL` (server-side) or `NEXT_PUBLIC_LAB_API_URL` (browser):

```bash
export LAB_API_URL=http://localhost:8765
pnpm --filter @high-signal/web dev
# → http://localhost:3000/lab
```

If `LAB_API_URL` is not set, the `/lab` page renders a "not provisioned" panel and shows zero
documents — the rest of High Signal keeps working.

## Schema

See `schema.sql`. Tables: `documents`, `repos`, `hn_threads`, `entities`, `document_entities`,
`links`, `ingest_runs`. `pgvector` is enabled; HNSW indexes are added once embeddings are
populated (deferred — Phase 1 currently uses Postgres FTS only).

## Scope

Phase 1 only (laptop). No embeddings/Qwen/GLiNER yet — those layer on top once the ranked feed
is genuinely useful. Re-ingest is idempotent; reruns upsert rather than duplicate.
