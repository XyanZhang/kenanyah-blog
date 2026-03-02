-- Enable pgvector extension (requires Postgres image with pgvector, e.g. pgvector/pgvector:pg16)
CREATE EXTENSION IF NOT EXISTS vector;

-- Store embeddings for semantic search (one row per post, single chunk: title + tags + content prefix)
CREATE TABLE IF NOT EXISTS post_embeddings (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content    TEXT NOT NULL,
  embedding  vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_embeddings_post_id ON post_embeddings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_embeddings_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops);
