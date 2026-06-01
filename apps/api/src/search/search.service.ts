import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Prisma } from '@ozonwb/db';
import { SortOption } from '@ozonwb/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SEARCH_QUEUE } from '../queue/queue.module';
import { CreateSearchDto } from './dto';

const DEFAULT_ENABLED = (process.env.ENABLED_MARKETPLACES ?? 'ozon,wildberries')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEARCH_QUEUE) private readonly queue: Queue,
  ) {}

  async create(userId: string, dto: CreateSearchDto) {
    // Оставляем только включённые маркетплейсы.
    const marketplaces = dto.marketplaces.filter((m) => DEFAULT_ENABLED.includes(m));
    const filters = dto.filters ?? {};
    const sort: SortOption = dto.sort ?? 'best_value';

    const search = await this.prisma.search.create({
      data: {
        userId,
        query: dto.query,
        marketplaces: marketplaces.length ? marketplaces : DEFAULT_ENABLED,
        filters: filters as unknown as Prisma.InputJsonValue,
        sort,
        status: 'processing',
      },
    });

    await this.queue.add(
      'search',
      { searchId: search.id },
      { jobId: search.id },
    );

    return { searchId: search.id, status: search.status };
  }

  async getStatus(userId: string, searchId: string) {
    const search = await this.prisma.search.findFirst({
      where: { id: searchId, userId },
    });
    if (!search) throw new NotFoundException('Поиск не найден');
    return {
      searchId: search.id,
      status: search.status,
      query: search.query,
      marketplaces: search.marketplaces,
      error: search.error,
      createdAt: search.createdAt,
      completedAt: search.completedAt,
    };
  }

  async getResults(userId: string, searchId: string, limit = 20) {
    const search = await this.prisma.search.findFirst({
      where: { id: searchId, userId },
    });
    if (!search) throw new NotFoundException('Поиск не найден');

    const orderBy = this.orderFor(search.sort as SortOption);
    const offers = await this.prisma.offer.findMany({
      where: { searchId },
      orderBy,
      take: limit,
    });

    return {
      searchId: search.id,
      status: search.status,
      query: search.query,
      error: search.error,
      results: offers.map((o) => ({
        id: o.id,
        marketplace: o.marketplace,
        title: o.title,
        price: o.price,
        oldPrice: o.oldPrice ?? undefined,
        discountPercent: o.discountPercent ?? undefined,
        rating: o.rating ?? undefined,
        reviewsCount: o.reviewsCount ?? undefined,
        sellerName: o.sellerName ?? undefined,
        sellerRating: o.sellerRating ?? undefined,
        imageUrl: o.imageUrl ?? undefined,
        productUrl: o.productUrl,
        availability: o.availability,
        score: o.score,
        scoreReasons: o.scoreReasons,
      })),
    };
  }

  async history(userId: string) {
    const searches = await this.prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { offers: true } } },
    });
    return searches.map((s) => ({
      searchId: s.id,
      query: s.query,
      marketplaces: s.marketplaces,
      status: s.status,
      resultsCount: s._count.offers,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    }));
  }

  private orderFor(sort: SortOption): Prisma.OfferOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'rating':
        return { rating: 'desc' };
      case 'reviews':
        return { reviewsCount: 'desc' };
      case 'best_value':
      default:
        return { score: 'desc' };
    }
  }
}
