ALTER TABLE "collaborative_documents"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "isShareable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shareId" TEXT;

ALTER TABLE "collaborative_document_folders"
  ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "collaborative_documents_shareId_key" ON "collaborative_documents"("shareId");
CREATE INDEX IF NOT EXISTS "collaborative_document_folders_ownerId_idx" ON "collaborative_document_folders"("ownerId");
