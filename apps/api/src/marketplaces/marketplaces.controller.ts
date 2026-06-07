import { Controller, Get } from '@nestjs/common';
import { MarketplaceInfo } from '@ozonwb/shared';
import { PrismaService } from '../prisma/prisma.service';

// Каталог известных маркетплейсов. Новый источник добавляется одной строкой здесь
// и соответствующим адаптером в worker.
const CATALOG: { id: string; name: string }[] = [
  { id: 'ozon', name: 'Ozon' },
  { id: 'wildberries', name: 'Wildberries' },
  { id: 'citilink', name: 'Ситилинк' },
  { id: 'megamarket', name: 'Мегамаркет' },
];

function enabledList(): string[] {
  return (process.env.ENABLED_MARKETPLACES ?? 'ozon,wildberries').split(',').map((s) => s.trim());
}

@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(): MarketplaceInfo[] {
    const enabled = enabledList();
    return CATALOG.map((m) => ({
      id: m.id,
      name: m.name,
      enabled: enabled.includes(m.id),
    }));
  }

  /** Здоровье парсеров: последний лог по каждому маркетплейсу за 24 часа (из ParserLog). */
  @Get('health')
  async health() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await this.prisma.parserLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const enabled = enabledList();
    return CATALOG.map((m) => {
      const last = logs.find((l) => l.marketplace === m.id);
      return {
        id: m.id,
        name: m.name,
        enabled: enabled.includes(m.id),
        lastLevel: last?.level ?? null,
        lastMessage: last?.message ?? null,
        lastAt: last?.createdAt ?? null,
      };
    });
  }
}
