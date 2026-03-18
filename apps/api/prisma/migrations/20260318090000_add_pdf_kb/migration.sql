-- PDF Knowledge Base tables (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS pdf_documents (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  filename   TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  size       INTEGER NOT NULL,
  file_url   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdf_documents_user_id ON pdf_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_created_at ON pdf_documents(created_at);

CREATE TABLE IF NOT EXISTS pdf_chunks (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  page_start  INTEGER,
  page_end    INTEGER,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pdf_chunks_document_chunk ON pdf_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_pdf_chunks_document_id ON pdf_chunks(document_id);

CREATE TABLE IF NOT EXISTS pdf_chunk_embeddings (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
  chunk_id    TEXT NOT NULL UNIQUE REFERENCES pdf_chunks(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdf_chunk_embeddings_document_id ON pdf_chunk_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_chunk_embeddings_hnsw ON pdf_chunk_embeddings USING hnsw (embedding vector_cosine_ops);

