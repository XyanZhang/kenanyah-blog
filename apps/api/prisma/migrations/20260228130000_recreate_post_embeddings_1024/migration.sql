-- Recreate post_embeddings after Prisma dropped it (table not in schema). Use 1024 dimensions for text-embedding-v4 etc.
-- DROP IF EXISTS 保证在 shadow 库重放时幂等：若前面迁移已建表则先删再建，避免重复建表报错
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS post_embeddings;

CREATE TABLE post_embeddings (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content    TEXT NOT NULL,
  embedding  vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_embeddings_post_id ON post_embeddings(post_id);
CREATE INDEX idx_post_embeddings_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops);
