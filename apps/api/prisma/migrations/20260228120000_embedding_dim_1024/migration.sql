-- Embedding API returns 1024 dimensions (e.g. text-embedding-v4), table was vector(1536).
-- Drop index, change column dimension, recreate index.
DROP INDEX IF EXISTS idx_post_embeddings_hnsw;

ALTER TABLE post_embeddings DROP COLUMN embedding;
ALTER TABLE post_embeddings ADD COLUMN embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_post_embeddings_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops);
