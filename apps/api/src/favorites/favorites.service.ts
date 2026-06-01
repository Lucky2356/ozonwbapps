import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto } from './dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, dto: CreateFavoriteDto) {
    // upsert по (userId, productUrl): повторное добавление не создаёт дубль.
    return this.prisma.favorite.upsert({
      where: { userId_productUrl: { userId, productUrl: dto.productUrl } },
      create: { userId, ...dto },
      update: {
        title: dto.title,
        price: dto.price,
        oldPrice: dto.oldPrice,
        rating: dto.rating,
        reviewsCount: dto.reviewsCount,
        imageUrl: dto.imageUrl,
        marketplace: dto.marketplace,
      },
    });
  }

  list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const fav = await this.prisma.favorite.findFirst({ where: { id, userId } });
    if (!fav) throw new NotFoundException('Избранное не найдено');
    await this.prisma.favorite.delete({ where: { id } });
    return { ok: true };
  }
}
