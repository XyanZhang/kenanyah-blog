-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT,
    "tags" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "favicon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_url_key" ON "bookmarks"("url");

-- CreateIndex
CREATE INDEX "bookmarks_category_idx" ON "bookmarks"("category");

-- CreateIndex
CREATE INDEX "bookmarks_created_at_idx" ON "bookmarks"("created_at");
