ALTER TABLE "collaborative_documents"
  ADD COLUMN IF NOT EXISTS "folderPath" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "collaborative_documents_folderPath_idx"
  ON "collaborative_documents"("folderPath");

CREATE TABLE IF NOT EXISTS "collaborative_document_folders" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentPath" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collaborative_document_folders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "collaborative_document_folders_path_key"
  ON "collaborative_document_folders"("path");

CREATE INDEX IF NOT EXISTS "collaborative_document_folders_parentPath_idx"
  ON "collaborative_document_folders"("parentPath");
