CREATE TABLE IF NOT EXISTS conversation_embeddings (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_embeddings_conversation_id
  ON conversation_embeddings(conversation_id);
