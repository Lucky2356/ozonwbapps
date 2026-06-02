import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto';
import { getBotUsername, isTelegramConfigured } from './telegram';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, telegramChatId: true },
    });
    return { ...user, telegramConfigured: isTelegramConfigured() };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    // Пустая строка трактуется как отключение Telegram-уведомлений.
    const telegramChatId =
      dto.telegramChatId === undefined ? undefined : dto.telegramChatId?.trim() || null;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId },
      select: { id: true, email: true, telegramChatId: true },
    });
    return { ...user, telegramConfigured: isTelegramConfigured() };
  }

  /**
   * Создаёт одноразовый код привязки Telegram и deep-link на бота.
   * Пользователь открывает ссылку и жмёт «Запустить» — бот ловит /start <код> и
   * привязывает свой chatId к этому аккаунту (см. worker/telegrambot.ts).
   */
  async createLinkCode(userId: string) {
    if (!isTelegramConfigured()) {
      return { enabled: false as const };
    }
    const code = randomBytes(5).toString('hex'); // 10 hex-символов
    await this.prisma.user.update({ where: { id: userId }, data: { telegramLinkCode: code } });
    const botUsername = await getBotUsername();
    return {
      enabled: true as const,
      code,
      botUsername,
      deepLink: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
    };
  }
}
