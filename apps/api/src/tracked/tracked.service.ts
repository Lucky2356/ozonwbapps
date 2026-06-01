import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackedDto } from './dto';

@Injectable()
export class TrackedService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, dto: CreateTrackedDto) {
    const tracked = await this.prisma.trackedProduct.upsert({
      where: { userId_productUrl: { userId, productUrl: dto.productUrl } },
      create: {
        userId,
        marketplace: dto.marketplace,
        title: dto.title,
        productUrl: dto.productUrl,
        targetPrice: dto.targetPrice,
        lastPrice: dto.currentPrice,
      },
      update: {
        title: dto.title,
        targetPrice: dto.targetPrice,
        lastPrice: dto.currentPrice,
        marketplace: dto.marketplace,
      },
    });

    // Стартовая точка истории цен.
    if (typeof dto.currentPrice === 'number') {
      await this.prisma.priceHistory.create({
        data: { trackedProductId: tracked.id, price: dto.currentPrice },
      });
    }
    return tracked;
  }

  list(userId: string) {
    return this.prisma.trackedProduct.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        priceHistory: { orderBy: { recordedAt: 'asc' } },
      },
    });
  }

  async remove(userId: string, id: string) {
    const tracked = await this.prisma.trackedProduct.findFirst({ where: { id, userId } });
    if (!tracked) throw new NotFoundException('Отслеживаемый товар не найден');
    await this.prisma.trackedProduct.delete({ where: { id } });
    return { ok: true };
  }
}
