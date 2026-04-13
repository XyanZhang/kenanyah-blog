-- CreateEnum
CREATE TYPE "EventSourceType" AS ENUM ('manual', 'post', 'thought', 'project', 'photo', 'system');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('planned', 'completed', 'canceled');

-- CreateTable
CREATE TABLE "project_entries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "href" TEXT,
  "cover_image" TEXT,
  "category" TEXT,
  "tags" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active',
  "started_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "project_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_entries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "title" TEXT,
  "description" TEXT,
  "image_url" TEXT,
  "taken_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "photo_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_items" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "source_type" "EventSourceType" NOT NULL,
  "source_id" TEXT,
  "status" "EventStatus" NOT NULL DEFAULT 'planned',
  "event_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "all_day" BOOLEAN NOT NULL DEFAULT true,
  "entry_method" TEXT NOT NULL DEFAULT 'manual',
  "auto_generated" BOOLEAN NOT NULL DEFAULT false,
  "payload_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "event_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_entries_user_id_idx" ON "project_entries"("user_id");

-- CreateIndex
CREATE INDEX "project_entries_created_at_idx" ON "project_entries"("created_at");

-- CreateIndex
CREATE INDEX "project_entries_started_at_idx" ON "project_entries"("started_at");

-- CreateIndex
CREATE INDEX "photo_entries_user_id_idx" ON "photo_entries"("user_id");

-- CreateIndex
CREATE INDEX "photo_entries_created_at_idx" ON "photo_entries"("created_at");

-- CreateIndex
CREATE INDEX "photo_entries_taken_at_idx" ON "photo_entries"("taken_at");

-- CreateIndex
CREATE INDEX "event_items_user_id_idx" ON "event_items"("user_id");

-- CreateIndex
CREATE INDEX "event_items_user_id_event_date_idx" ON "event_items"("user_id", "event_date");

-- CreateIndex
CREATE INDEX "event_items_user_id_status_event_date_idx" ON "event_items"("user_id", "status", "event_date");

-- CreateIndex
CREATE INDEX "event_items_source_type_source_id_idx" ON "event_items"("source_type", "source_id");

-- AddForeignKey
ALTER TABLE "project_entries"
ADD CONSTRAINT "project_entries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_entries"
ADD CONSTRAINT "photo_entries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_items"
ADD CONSTRAINT "event_items_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
