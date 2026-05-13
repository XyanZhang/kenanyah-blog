ALTER TABLE "collaborative_documents"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "isShareable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shareId" TEXT;

ALTER TABLE "collaborative_document_folders"
  ADD COLUMN "ownerId" TEXT;

CREATE UNIQUE INDEX "collaborative_documents_shareId_key" ON "collaborative_documents"("shareId");
CREATE INDEX "collaborative_document_folders_ownerId_idx" ON "collaborative_document_folders"("ownerId");
