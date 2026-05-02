-- CreateEnum
CREATE TYPE "AppScope" AS ENUM ('hub', 'dedicated');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "app_scope" "AppScope" NOT NULL DEFAULT 'hub',
ADD COLUMN     "locked_companion_id" TEXT;

-- CreateTable
CREATE TABLE "CompanionTelegramBot" (
    "id" TEXT NOT NULL,
    "companion_id" TEXT NOT NULL,
    "bot_username" TEXT NOT NULL,
    "webhook_secret" TEXT NOT NULL,
    "bot_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanionTelegramBot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanionTelegramBot_companion_id_key" ON "CompanionTelegramBot"("companion_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanionTelegramBot_bot_username_key" ON "CompanionTelegramBot"("bot_username");

-- CreateIndex
CREATE UNIQUE INDEX "CompanionTelegramBot_webhook_secret_key" ON "CompanionTelegramBot"("webhook_secret");

-- AddForeignKey
ALTER TABLE "CompanionTelegramBot" ADD CONSTRAINT "CompanionTelegramBot_companion_id_fkey" FOREIGN KEY ("companion_id") REFERENCES "AICompanion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
