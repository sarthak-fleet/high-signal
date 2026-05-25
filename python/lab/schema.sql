-- HighSignal Lab — local-first Postgres substrate (plan 0007).
-- Idempotent: re-run is safe. Bring up with `docker compose up -d`.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS documents (
  id              BIGSERIAL PRIMARY KEY,
  url             TEXT NOT NULL UNIQUE,
  canonical_url   TEXT,
  source          TEXT NOT NULL,             -- 'hn' | 'github' | 'blog' | 'arxiv' | ...
  domain          TEXT,
  title           TEXT,
  extracted_text  TEXT,
  summary         TEXT,
  short_summary   TEXT,
  published_at    TIMESTAMPTZ,
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  embedding       vector(384),
  signal_score    DOUBLE PRECISION DEFAULT 0,
  score_factors   JSONB DEFAULT '{}'::jsonb,
  cluster_id      BIGINT,
  review_status   TEXT NOT NULL DEFAULT 'unreviewed',  -- unreviewed | promoted | killed
  tsv             tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(extracted_text, '')), 'C')
  ) STORED
);
CREATE INDEX IF NOT EXISTS documents_tsv_idx ON documents USING gin (tsv);
CREATE INDEX IF NOT EXISTS documents_score_idx ON documents (signal_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS documents_source_idx ON documents (source);
CREATE INDEX IF NOT EXISTS documents_discovered_idx ON documents (discovered_at DESC);
CREATE INDEX IF NOT EXISTS documents_cluster_idx ON documents (cluster_id);
-- Vector HNSW index created lazily once embeddings exist (skip on empty table):
-- CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS repos (
  id              BIGSERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL UNIQUE,      -- 'owner/repo'
  url             TEXT NOT NULL,
  description     TEXT,
  stars           INTEGER NOT NULL DEFAULT 0,
  forks           INTEGER NOT NULL DEFAULT 0,
  language        TEXT,
  topics          TEXT[],
  last_commit_at  TIMESTAMPTZ,
  readme_summary  TEXT,
  embedding       vector(384),
  signal_score    DOUBLE PRECISION DEFAULT 0,
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repos_stars_idx ON repos (stars DESC);
CREATE INDEX IF NOT EXISTS repos_score_idx ON repos (signal_score DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS hn_threads (
  hn_id           BIGINT PRIMARY KEY,
  document_id     BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL DEFAULT 0,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  posted_at       TIMESTAMPTZ NOT NULL,
  last_polled_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_threads_posted_idx ON hn_threads (posted_at DESC);

CREATE TABLE IF NOT EXISTS entities (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS document_entities (
  document_id     BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, entity_id)
);

CREATE TABLE IF NOT EXISTS links (
  id              BIGSERIAL PRIMARY KEY,
  from_document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  to_url          TEXT NOT NULL,
  to_document_id  BIGINT REFERENCES documents(id) ON DELETE SET NULL,
  to_repo_id      BIGINT REFERENCES repos(id) ON DELETE SET NULL,
  link_type       TEXT NOT NULL,  -- 'submitted' | 'discusses' | 'mentions'
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS links_from_idx ON links (from_document_id);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id              BIGSERIAL PRIMARY KEY,
  source          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  inserted        INTEGER NOT NULL DEFAULT 0,
  updated         INTEGER NOT NULL DEFAULT 0,
  errors          INTEGER NOT NULL DEFAULT 0,
  notes           TEXT
);
