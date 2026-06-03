-- Умные ценовые алерты: порог снижения и дайджест в Telegram (per-user)
ALTER TABLE "User" ADD COLUMN "priceDropThresholdPercent" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "telegramDigest" TEXT NOT NULL DEFAULT 'off';
