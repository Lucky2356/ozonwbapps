import { prisma } from '@ozonwb/db';
import {
  MarketplaceOffer,
  SearchParams,
  SearchFilters,
  SortOption,
  computeScores,
  loadWeightsFromEnv,
} from '@ozonwb/shared';
import { resolveAdapters } from './adapters/registry';
import { dedupe } from './adapters/base';
import { getCached, setCached } from './cache';
import { getLimiter } from './ratelimit';
import { config } from './config';
import { logger } from './logger';

async function parserLog(marketplace: string, searchId: string, level: string, message: string) {
  try {
    await prisma.parserLog.create({ data: { marketplace, searchId, level, message } });
  } catch {
    // логирование не должно ронять обработку
  }
}

/** Запускает один адаптер: кеш -> rate-limit -> парсинг. Изолирует ошибки. */
async function runAdapter(
  marketplace: string,
  params: SearchParams,
  searchId: string,
): Promise<MarketplaceOffer[]> {
  const adapters = resolveAdapters([marketplace]);
  const adapter = adapters[0];
  if (!adapter) return [];

  const cached = await getCached(marketplace, params.query);
  if (cached) {
    logger.info('Кеш-хит', { marketplace, query: params.query, count: cached.length });
    // Фильтры применяем к кешу заново (они могли измениться).
    const { applyFilters } = await import('./adapters/base');
    return applyFilters(cached, params.filters);
  }

  try {
    const offers = await getLimiter(marketplace).schedule(() => adapter.search(params));
    await setCached(marketplace, params.query, offers);
    logger.info('Парсинг завершён', { marketplace, count: offers.length });
    if (offers.length === 0) {
      await parserLog(marketplace, searchId, 'warn', 'Парсер вернул 0 товаров');
    }
    return offers;
  } catch (e) {
    logger.error('Адаптер упал', { marketplace, error: String(e) });
    await parserLog(marketplace, searchId, 'error', String(e));
    return [];
  }
}

/** Основная обработка поисковой задачи. */
export async function processSearch(searchId: string): Promise<void> {
  const search = await prisma.search.findUnique({ where: { id: searchId } });
  if (!search) {
    logger.warn('Поиск не найден', { searchId });
    return;
  }

  const filters = (search.filters as SearchFilters) ?? {};
  const params: SearchParams = {
    query: search.query,
    marketplaces: search.marketplaces,
    filters,
    sort: search.sort as SortOption,
    maxItems: config.maxItems,
  };

  try {
    // Все маркетплейсы параллельно; падение одного не ломает остальные.
    const settled = await Promise.allSettled(
      search.marketplaces.map((m) => runAdapter(m, params, searchId)),
    );
    const collected = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    const unique = dedupe(collected);
    const weights = loadWeightsFromEnv(config.scoreWeights as Record<string, string | undefined>);
    const scored = computeScores(unique, weights);

    // Сохраняем результаты.
    if (scored.length > 0) {
      await prisma.offer.createMany({
        data: scored.map((o) => ({
          searchId,
          marketplace: o.marketplace,
          externalId: o.id.split(':').slice(1).join(':') || o.id,
          title: o.title,
          price: o.price,
          oldPrice: o.oldPrice,
          discountPercent: o.discountPercent,
          rating: o.rating,
          reviewsCount: o.reviewsCount,
          sellerName: o.sellerName,
          sellerRating: o.sellerRating,
          imageUrl: o.imageUrl,
          productUrl: o.productUrl,
          availability: o.availability,
          deliveryInfo: o.deliveryInfo,
          score: o.score,
          scoreReasons: o.scoreReasons,
          collectedAt: new Date(o.collectedAt),
        })),
      });
    }

    await prisma.search.update({
      where: { id: searchId },
      data: { status: 'completed', completedAt: new Date() },
    });
    logger.info('Поиск завершён', { searchId, total: scored.length });
  } catch (e) {
    logger.error('Ошибка обработки поиска', { searchId, error: String(e) });
    await prisma.search.update({
      where: { id: searchId },
      data: { status: 'failed', error: String(e), completedAt: new Date() },
    });
  }
}
