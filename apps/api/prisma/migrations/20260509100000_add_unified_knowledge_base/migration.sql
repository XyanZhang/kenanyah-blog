CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id           TEXT PRIMARY KEY,
  domain       TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  source_type  TEXT NOT NULL DEFAULT 'text',
  status       TEXT NOT NULL DEFAULT 'ready',
  metadata     JSONB,
  chunk_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_domain ON knowledge_sources(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_domain_status ON knowledge_sources(domain, status);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           TEXT PRIMARY KEY,
  source_id    TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_chunks_source_id_chunk_index_key ON knowledge_chunks(source_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_domain ON knowledge_chunks(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_id ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_domain_source_id ON knowledge_chunks(domain, source_id);

CREATE TABLE IF NOT EXISTS knowledge_chunk_embeddings (
  id           TEXT PRIMARY KEY,
  source_id    TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL,
  chunk_id     TEXT NOT NULL UNIQUE REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  metadata     JSONB,
  embedding    vector(1024) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embeddings_domain ON knowledge_chunk_embeddings(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embeddings_source_id ON knowledge_chunk_embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embeddings_domain_source_id ON knowledge_chunk_embeddings(domain, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embeddings_hnsw ON knowledge_chunk_embeddings USING hnsw (embedding vector_cosine_ops);

INSERT INTO knowledge_sources (id, domain, title, description, source_type, status, metadata, chunk_count, created_at, updated_at)
SELECT
  id,
  'yijing',
  title,
  description,
  'text',
  status,
  NULL,
  chunk_count,
  created_at,
  updated_at
FROM yijing_sources
ON CONFLICT (id) DO UPDATE SET
  domain = EXCLUDED.domain,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  source_type = EXCLUDED.source_type,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  chunk_count = EXCLUDED.chunk_count,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge_chunks (id, source_id, domain, chunk_index, title, content, metadata, created_at, updated_at)
SELECT
  id,
  source_id,
  'yijing',
  chunk_index,
  title,
  content,
  jsonb_strip_nulls(jsonb_build_object('hexagramName', hexagram_name)),
  created_at,
  updated_at
FROM yijing_chunks
ON CONFLICT (source_id, chunk_index) DO UPDATE SET
  id = EXCLUDED.id,
  domain = EXCLUDED.domain,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge_chunk_embeddings (id, source_id, domain, chunk_id, chunk_index, title, content, metadata, embedding, created_at)
SELECT
  id,
  source_id,
  'yijing',
  chunk_id,
  chunk_index,
  title,
  content,
  NULL,
  embedding,
  created_at
FROM yijing_chunk_embeddings
ON CONFLICT (chunk_id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  domain = EXCLUDED.domain,
  chunk_index = EXCLUDED.chunk_index,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  embedding = EXCLUDED.embedding;

INSERT INTO knowledge_sources (id, domain, title, description, source_type, status, metadata, chunk_count, created_at, updated_at)
SELECT
  id,
  'ziwei',
  title,
  description,
  'pdf',
  status,
  NULL,
  chunk_count,
  created_at,
  updated_at
FROM ziwei_sources
ON CONFLICT (id) DO UPDATE SET
  domain = EXCLUDED.domain,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  source_type = EXCLUDED.source_type,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  chunk_count = EXCLUDED.chunk_count,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge_chunks (id, source_id, domain, chunk_index, title, content, metadata, created_at, updated_at)
SELECT
  id,
  source_id,
  'ziwei',
  chunk_index,
  title,
  content,
  jsonb_strip_nulls(jsonb_build_object('sectionTitle', section_title)),
  created_at,
  updated_at
FROM ziwei_chunks
ON CONFLICT (source_id, chunk_index) DO UPDATE SET
  id = EXCLUDED.id,
  domain = EXCLUDED.domain,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

INSERT INTO knowledge_chunk_embeddings (id, source_id, domain, chunk_id, chunk_index, title, content, metadata, embedding, created_at)
SELECT
  id,
  source_id,
  'ziwei',
  chunk_id,
  chunk_index,
  title,
  content,
  jsonb_strip_nulls(jsonb_build_object('sectionTitle', section_title)),
  embedding,
  created_at
FROM ziwei_chunk_embeddings
ON CONFLICT (chunk_id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  domain = EXCLUDED.domain,
  chunk_index = EXCLUDED.chunk_index,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  metadata = EXCLUDED.metadata,
  embedding = EXCLUDED.embedding;
