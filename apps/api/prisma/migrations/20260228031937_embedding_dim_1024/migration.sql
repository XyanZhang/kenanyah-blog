/*
  Warnings:

  - You are about to drop the `post_embeddings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "post_embeddings" DROP CONSTRAINT "post_embeddings_post_id_fkey";

-- DropTable
DROP TABLE "post_embeddings";
