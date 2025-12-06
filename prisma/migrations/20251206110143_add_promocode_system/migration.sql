-- CreateTable
CREATE TABLE "Promocodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "energy" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "usage_limit" INTEGER,

    CONSTRAINT "Promocodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromocodeUsage" (
    "id" TEXT NOT NULL,
    "promocode_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromocodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promocodes_code_key" ON "Promocodes"("code");

-- CreateIndex
CREATE INDEX "Promocodes_code_idx" ON "Promocodes"("code");

-- CreateIndex
CREATE INDEX "Promocodes_is_active_idx" ON "Promocodes"("is_active");

-- CreateIndex
CREATE INDEX "PromocodeUsage_promocode_id_idx" ON "PromocodeUsage"("promocode_id");

-- CreateIndex
CREATE INDEX "PromocodeUsage_user_id_idx" ON "PromocodeUsage"("user_id");

-- CreateIndex
CREATE INDEX "PromocodeUsage_used_at_idx" ON "PromocodeUsage"("used_at");

-- CreateIndex
CREATE UNIQUE INDEX "PromocodeUsage_promocode_id_user_id_key" ON "PromocodeUsage"("promocode_id", "user_id");
