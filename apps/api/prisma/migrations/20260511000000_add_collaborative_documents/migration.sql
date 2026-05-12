CREATE TABLE "collaborative_documents" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "ownerId" TEXT,
  "summary" TEXT,
  "snapshotJson" TEXT,
  "lastEditedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collaborative_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collaborative_document_states" (
  "documentId" TEXT NOT NULL,
  "ydoc" BYTEA NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collaborative_document_states_pkey" PRIMARY KEY ("documentId")
);

CREATE UNIQUE INDEX "collaborative_documents_slug_key" ON "collaborative_documents"("slug");
CREATE INDEX "collaborative_documents_ownerId_idx" ON "collaborative_documents"("ownerId");
CREATE INDEX "collaborative_documents_lastEditedAt_idx" ON "collaborative_documents"("lastEditedAt");

ALTER TABLE "collaborative_document_states"
  ADD CONSTRAINT "collaborative_document_states_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "collaborative_documents"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

