import { Controller, Get } from '@nestjs/common';
import { MarketplaceInfo } from '@ozonwb/shared';

// Каталог известных маркетплейсов. Новый источник добавляется одной строкой здесь
// и соответствующим адаптером в worker.
const CATALOG: { id: string; name: string }[] = [
  { id: 'ozon', name: 'Ozon' },
  { id: 'wildberries', name: 'Wildberries' },
  { id: 'yandex_market', name: 'Яндекс Маркет' },
  { id: 'dns', name: 'DNS' },
];

@Controller('marketplaces')
export class MarketplacesController {
  @Get()
  list(): MarketplaceInfo[] {
    const enabled = (process.env.ENABLED_MARKETPLACES ?? 'ozon,wildberries')
      .split(',')
      .map((s) => s.trim());
    return CATALOG.map((m) => ({
      id: m.id,
      name: m.name,
      enabled: enabled.includes(m.id),
    }));
  }
}
