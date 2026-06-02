import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, telegramChatId: true },
    });
    return user;
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
    return user;
  }
}
