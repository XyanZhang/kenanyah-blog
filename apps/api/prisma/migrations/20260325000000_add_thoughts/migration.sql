-- Enable pgvector extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "thoughts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT,
    "content" TEXT NOT NULL,
    "images" JSONB,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "thoughts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "thoughts" ADD CONSTRAINT "thoughts_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "thoughts_author_id_idx" ON "thoughts"("author_id");

-- CreateIndex
CREATE INDEX "thoughts_created_at_idx" ON "thoughts"("created_at");

-- Thought embeddings (for semantic search / RAG)
CREATE TABLE IF NOT EXISTS thought_embeddings (
  id          TEXT PRIMARY KEY,
  thought_id  TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content     TEXT NOT NULL,
  embedding   vector(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thought_embeddings_thought_id ON thought_embeddings(thought_id);
CREATE INDEX IF NOT EXISTS idx_thought_embeddings_hnsw ON thought_embeddings USING hnsw (embedding vector_cosine_ops);

