/*
  Warnings:

  - You are about to drop the column `isPremium` on the `AICompanion` table. All the data in the column will be lost.
  - The `avatar` column on the `AICompanion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `publicBio` to the `AICompanion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemPrompt` to the `AICompanion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AICompanion" DROP COLUMN "isPremium",
ADD COLUMN     "publicBio" TEXT NOT NULL,
ADD COLUMN     "systemPrompt" JSONB NOT NULL,
DROP COLUMN "avatar",
ADD COLUMN     "avatar" TEXT[],
ALTER COLUMN "energyCost" SET DEFAULT 1;
