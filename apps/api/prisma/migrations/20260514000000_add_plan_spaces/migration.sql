-- CreateEnum
CREATE TYPE "PlanSpaceStatus" AS ENUM ('active', 'archived', 'completed');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('planned', 'in_progress', 'done', 'blocked', 'canceled');

-- CreateEnum
CREATE TYPE "PlanItemPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "PlanSharePermission" AS ENUM ('read', 'edit');

-- CreateTable
CREATE TABLE "plan_spaces" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'general',
  "icon" TEXT NOT NULL DEFAULT 'CalendarCheck',
  "description" TEXT,
  "status" "PlanSpaceStatus" NOT NULL DEFAULT 'active',
  "start_date" DATE,
  "end_date" DATE,
  "collaboration_on" BOOLEAN NOT NULL DEFAULT true,
  "share_token" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plan_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_items" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "date" DATE NOT NULL,
  "start_time" TEXT,
  "end_time" TEXT,
  "all_day" BOOLEAN NOT NULL DEFAULT true,
  "status" "PlanItemStatus" NOT NULL DEFAULT 'planned',
  "priority" "PlanItemPriority" NOT NULL DEFAULT 'medium',
  "assignee" TEXT,
  "category" TEXT,
  "is_milestone" BOOLEAN NOT NULL DEFAULT false,
  "synced_event_id" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_share_links" (
  "id" TEXT NOT NULL,
  "space_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "permission" "PlanSharePermission" NOT NULL DEFAULT 'edit',
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "plan_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_spaces_share_token_key" ON "plan_spaces"("share_token");

-- CreateIndex
CREATE INDEX "plan_spaces_owner_id_idx" ON "plan_spaces"("owner_id");

-- CreateIndex
CREATE INDEX "plan_spaces_status_idx" ON "plan_spaces"("status");

-- CreateIndex
CREATE INDEX "plan_spaces_start_date_idx" ON "plan_spaces"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "plan_items_synced_event_id_key" ON "plan_items"("synced_event_id");

-- CreateIndex
CREATE INDEX "plan_items_space_id_idx" ON "plan_items"("space_id");

-- CreateIndex
CREATE INDEX "plan_items_space_id_date_idx" ON "plan_items"("space_id", "date");

-- CreateIndex
CREATE INDEX "plan_items_space_id_status_idx" ON "plan_items"("space_id", "status");

-- CreateIndex
CREATE INDEX "plan_items_space_id_is_milestone_idx" ON "plan_items"("space_id", "is_milestone");

-- CreateIndex
CREATE UNIQUE INDEX "plan_share_links_token_key" ON "plan_share_links"("token");

-- CreateIndex
CREATE INDEX "plan_share_links_space_id_idx" ON "plan_share_links"("space_id");

-- CreateIndex
CREATE INDEX "plan_share_links_expires_at_idx" ON "plan_share_links"("expires_at");

-- AddForeignKey
ALTER TABLE "plan_spaces"
ADD CONSTRAINT "plan_spaces_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items"
ADD CONSTRAINT "plan_items_space_id_fkey"
FOREIGN KEY ("space_id") REFERENCES "plan_spaces"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items"
ADD CONSTRAINT "plan_items_synced_event_id_fkey"
FOREIGN KEY ("synced_event_id") REFERENCES "event_items"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share_links"
ADD CONSTRAINT "plan_share_links_space_id_fkey"
FOREIGN KEY ("space_id") REFERENCES "plan_spaces"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
