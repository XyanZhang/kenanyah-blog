CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS yijing_sources (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ready',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yijing_sources_status ON yijing_sources(status);

CREATE TABLE IF NOT EXISTS yijing_chunks (
  id            TEXT PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES yijing_sources(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  hexagram_name TEXT,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS yijing_chunks_source_id_chunk_index_key ON yijing_chunks(source_id, chunk_index);
CREATE INDEX IF NOT EXISTS yijing_chunks_source_id_idx ON yijing_chunks(source_id);
CREATE INDEX IF NOT EXISTS yijing_chunks_hexagram_name_idx ON yijing_chunks(hexagram_name);

CREATE TABLE IF NOT EXISTS yijing_chunk_embeddings (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES yijing_sources(id) ON DELETE CASCADE,
  chunk_id    TEXT NOT NULL UNIQUE REFERENCES yijing_chunks(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1024) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yijing_chunk_embeddings_source_id ON yijing_chunk_embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_yijing_chunk_embeddings_hnsw ON yijing_chunk_embeddings USING hnsw (embedding vector_cosine_ops);
