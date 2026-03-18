/*
  Warnings:

  - Made the column `embedding` on table `pdf_chunk_embeddings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "pdf_chunk_embeddings" DROP CONSTRAINT "pdf_chunk_embeddings_chunk_id_fkey";

-- DropForeignKey
ALTER TABLE "pdf_chunk_embeddings" DROP CONSTRAINT "pdf_chunk_embeddings_document_id_fkey";

-- DropForeignKey
ALTER TABLE "pdf_chunks" DROP CONSTRAINT "pdf_chunks_document_id_fkey";

-- DropIndex
DROP INDEX "idx_pdf_chunk_embeddings_hnsw";

-- AlterTable
ALTER TABLE "pdf_chunk_embeddings" ALTER COLUMN "embedding" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pdf_chunks" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pdf_documents" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "pdf_chunks" ADD CONSTRAINT "pdf_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "pdf_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_chunk_embeddings" ADD CONSTRAINT "pdf_chunk_embeddings_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "pdf_chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_pdf_chunks_document_id" RENAME TO "pdf_chunks_document_id_idx";

-- RenameIndex
ALTER INDEX "uniq_pdf_chunks_document_chunk" RENAME TO "pdf_chunks_document_id_chunk_index_key";

-- RenameIndex
ALTER INDEX "idx_pdf_documents_created_at" RENAME TO "pdf_documents_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_pdf_documents_user_id" RENAME TO "pdf_documents_user_id_idx";
