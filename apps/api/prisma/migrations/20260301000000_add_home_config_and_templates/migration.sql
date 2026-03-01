-- CreateTable
CREATE TABLE "home_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "layoutJson" TEXT NOT NULL,
    "navJson" TEXT NOT NULL,
    "canvasJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_layout_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layoutJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_layout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_configs_userId_key" ON "home_configs"("userId");

-- CreateIndex
CREATE INDEX "home_layout_templates_userId_idx" ON "home_layout_templates"("userId");
