-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_id_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionHistory" DROP CONSTRAINT "SubscriptionHistory_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserSettings" DROP CONSTRAINT "UserSettings_user_id_fkey";
