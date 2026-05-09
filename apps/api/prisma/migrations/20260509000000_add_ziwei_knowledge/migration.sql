CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ziwei_sources (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ready',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ziwei_sources_status ON ziwei_sources(status);

CREATE TABLE IF NOT EXISTS ziwei_chunks (
  id            TEXT PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES ziwei_sources(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  section_title TEXT,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ziwei_chunks_source_id_chunk_index_key ON ziwei_chunks(source_id, chunk_index);
CREATE INDEX IF NOT EXISTS ziwei_chunks_source_id_idx ON ziwei_chunks(source_id);
CREATE INDEX IF NOT EXISTS ziwei_chunks_section_title_idx ON ziwei_chunks(section_title);

CREATE TABLE IF NOT EXISTS ziwei_chunk_embeddings (
  id            TEXT PRIMARY KEY,
  source_id     TEXT NOT NULL REFERENCES ziwei_sources(id) ON DELETE CASCADE,
  chunk_id      TEXT NOT NULL UNIQUE REFERENCES ziwei_chunks(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  section_title TEXT,
  content       TEXT NOT NULL,
  embedding     vector(1024) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ziwei_chunk_embeddings_source_id ON ziwei_chunk_embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_ziwei_chunk_embeddings_hnsw ON ziwei_chunk_embeddings USING hnsw (embedding vector_cosine_ops);
