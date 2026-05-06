CREATE TYPE "DraftIdeaStatus" AS ENUM ('idea', 'outlining', 'writing', 'published', 'archived');

CREATE TYPE "DraftIdeaSourceType" AS ENUM ('manual', 'thought', 'bookmark', 'pdf', 'chat');

CREATE TABLE "draft_ideas" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "angle" TEXT,
  "notes" TEXT,
  "status" "DraftIdeaStatus" NOT NULL DEFAULT 'idea',
  "source_type" "DraftIdeaSourceType" NOT NULL DEFAULT 'manual',
  "source_id" TEXT,
  "source_url" TEXT,
  "tags" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 2,
  "post_id" TEXT,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "draft_ideas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "draft_ideas_status_idx" ON "draft_ideas"("status");
CREATE INDEX "draft_ideas_source_type_source_id_idx" ON "draft_ideas"("source_type", "source_id");
CREATE INDEX "draft_ideas_post_id_idx" ON "draft_ideas"("post_id");
CREATE INDEX "draft_ideas_user_id_idx" ON "draft_ideas"("user_id");
CREATE INDEX "draft_ideas_updated_at_idx" ON "draft_ideas"("updated_at");

ALTER TABLE "draft_ideas"
  ADD CONSTRAINT "draft_ideas_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
