ALTER TABLE "chat_conversations"
ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "chat_conversations_isShared_idx" ON "chat_conversations"("isShared");
