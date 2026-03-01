-- Add nav and canvas to saved templates so applying a template restores nav position/size too
ALTER TABLE "home_layout_templates" ADD COLUMN IF NOT EXISTS "navJson" TEXT;
ALTER TABLE "home_layout_templates" ADD COLUMN IF NOT EXISTS "canvasJson" TEXT;

-- Backfill: existing rows get default nav so NOT NULL can be set
UPDATE "home_layout_templates" SET "navJson" = '{"horizontalPosition":{"x":0,"y":0},"verticalPosition":{"x":0,"y":0},"layout":"auto","customSize":null,"visibleItems":[]}' WHERE "navJson" IS NULL;
ALTER TABLE "home_layout_templates" ALTER COLUMN "navJson" SET NOT NULL;
