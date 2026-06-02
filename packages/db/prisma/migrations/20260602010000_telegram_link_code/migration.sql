-- AlterTable: одноразовый код привязки Telegram
ALTER TABLE "User" ADD COLUMN "telegramLinkCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramLinkCode_key" ON "User"("telegramLinkCode");
