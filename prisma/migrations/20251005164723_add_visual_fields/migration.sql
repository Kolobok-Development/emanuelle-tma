-- Add visual appearance and image seed fields to AICompanion table
ALTER TABLE "AICompanion" ADD COLUMN "visualAppearance" TEXT;
ALTER TABLE "AICompanion" ADD COLUMN "imageSeed" TEXT;
