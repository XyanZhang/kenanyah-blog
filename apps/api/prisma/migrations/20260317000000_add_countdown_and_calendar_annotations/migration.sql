-- CreateTable
CREATE TABLE "countdown_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countdown_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_annotations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "countdown_events_user_id_idx" ON "countdown_events"("user_id");

-- CreateIndex
CREATE INDEX "countdown_events_user_id_target_date_idx" ON "countdown_events"("user_id", "target_date");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_annotations_user_id_date_key" ON "calendar_annotations"("user_id", "date");

-- CreateIndex
CREATE INDEX "calendar_annotations_user_id_idx" ON "calendar_annotations"("user_id");

-- AddForeignKey
ALTER TABLE "countdown_events" ADD CONSTRAINT "countdown_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_annotations" ADD CONSTRAINT "calendar_annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
