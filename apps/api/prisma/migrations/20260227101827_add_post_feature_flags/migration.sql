-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "posts_isFeatured_idx" ON "posts"("isFeatured");
