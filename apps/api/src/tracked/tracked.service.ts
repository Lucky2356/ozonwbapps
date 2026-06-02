import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PRICE_CHECK_QUEUE } from '../queue/queue.module';
import { CreateTrackedDto, UpdateTrackedDto } from './dto';

@Injectable()
export class TrackedService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRICE_CHECK_QUEUE) private readonly priceCheckQueue: Queue,
  ) {}

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

  /** Обновляет целевую цену отслеживаемого товара. */
  async updateTarget(userId: string, id: string, dto: UpdateTrackedDto) {
    const tracked = await this.prisma.trackedProduct.findFirst({ where: { id, userId } });
    if (!tracked) throw new NotFoundException('Отслеживаемый товар не найден');
    return this.prisma.trackedProduct.update({
      where: { id },
      data: { targetPrice: dto.targetPrice ?? null },
    });
  }

  async remove(userId: string, id: string) {
    const tracked = await this.prisma.trackedProduct.findFirst({ where: { id, userId } });
    if (!tracked) throw new NotFoundException('Отслеживаемый товар не найден');
    await this.prisma.trackedProduct.delete({ where: { id } });
    return { ok: true };
  }

  /** Ставит разовую проверку цены товара в очередь (кнопка «Проверить сейчас»). */
  async requestCheck(userId: string, id: string) {
    const tracked = await this.prisma.trackedProduct.findFirst({ where: { id, userId } });
    if (!tracked) throw new NotFoundException('Отслеживаемый товар не найден');
    await this.priceCheckQueue.add('price-check', { trackedProductId: id });
    return { ok: true, queued: true };
  }
}
