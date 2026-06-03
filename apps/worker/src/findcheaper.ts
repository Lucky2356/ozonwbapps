import { prisma } from '@ozonwb/db';
import { MarketplaceOffer, SearchParams, searchQueryFromTitle, titleSimilarity } from '@ozonwb/shared';
import { resolveAdapters } from './adapters/registry';
import { getLimiter } from './ratelimit';
import { config } from './config';
import { logger } from './logger';
import { sendTelegram } from './notify';

type TrackedWithUser = Awaited<ReturnType<typeof loadTracked>>[number];

function loadTracked() {
  return prisma.trackedProduct.findMany({ include: { user: true } });
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

// Сколько дней не повторять уведомление об одном и том же дешёвом предложении.
const DEDUP_DAYS = 7;

/**
 * Ищет тот же товар дешевле на ДРУГИХ маркетплейсах для одного отслеживаемого товара.
 * Использует короткий запрос из названия и порог схожести названий. Возвращает true,
 * если уведомление создано. Ошибки изолированы (не бросает).
 */
export async function findCheaperFor(tp: TrackedWithUser): Promise<boolean> {
  const baseline = tp.lastPrice;
  if (baseline == null || baseline <= 0) return false; // не с чем сравнивать

  const query = searchQueryFromTitle(tp.title);
  if (!query) return false;

  const targets = config.enabledMarketplaces.filter((m) => m !== tp.marketplace);
  if (targets.length === 0) return false;

  const params = (m: string): SearchParams => ({
    query,
    marketplaces: [m],
    filters: {},
    sort: 'best_value',
    maxItems: 20,
  });

  const candidates: MarketplaceOffer[] = [];
  for (const m of targets) {
    const adapter = resolveAdapters([m])[0];
    if (!adapter) continue;
    try {
      const offers = await getLimiter(m).schedule(() => adapter.search(params(m)));
      candidates.push(...offers);
    } catch (e) {
      logger.warn('Найти дешевле: ошибка поиска', { marketplace: m, error: String(e) });
    }
  }

  // Совпадения по названию, дешевле текущей цены.
  const matches = candidates.filter(
    (o) =>
      o.price > 0 &&
      o.price < baseline &&
      titleSimilarity(tp.title, o.title) >= config.findCheaper.similarity,
  );
  if (matches.length === 0) return false;

  const best = matches.reduce((a, b) => (b.price < a.price ? b : a));

  // Антиспам: не повторяем для того же URL в течение DEDUP_DAYS.
  const since = new Date(Date.now() - DEDUP_DAYS * 24 * 60 * 60 * 1000);
  const dup = await prisma.notification.findFirst({
    where: { userId: tp.userId, type: 'cheaper_found', productUrl: best.productUrl, createdAt: { gte: since } },
  });
  if (dup) return false;

  const pct = Math.round((1 - best.price / baseline) * 100);
  const mpName = best.marketplace;
  const title = 'Нашли дешевле на другом маркетплейсе';
  const message = `«${tp.title}» дешевле на ${mpName}: ${fmt(best.price)} ₽ (−${pct}% к вашей ${fmt(baseline)} ₽).`;

  await prisma.notification.create({
    data: {
      userId: tp.userId,
      type: 'cheaper_found',
      title,
      message,
      trackedProductId: tp.id,
      productUrl: best.productUrl,
    },
  });

  if (tp.user.telegramChatId) {
    await sendTelegram(tp.user.telegramChatId, `<b>${title}</b>\n${message}\n${best.productUrl}`);
  }

  logger.info('Найти дешевле: создано уведомление', { id: tp.id, marketplace: mpName, price: best.price });
  return true;
}

/** Прогон по всем отслеживаемым товарам (для cron). Один сбой не ломает остальные. */
export async function findCheaperAll(): Promise<void> {
  const tracked = await loadTracked();
  if (tracked.length === 0) {
    logger.info('Найти дешевле: нет отслеживаемых товаров');
    return;
  }
  logger.info('Найти дешевле: запускаю поиск', { count: tracked.length });

  let found = 0;
  for (const tp of tracked) {
    try {
      if (await findCheaperFor(tp)) found++;
    } catch (e) {
      logger.warn('Найти дешевле: сбой по товару', { id: tp.id, error: String(e) });
    }
  }
  logger.info('Найти дешевле: поиск завершён', { found, total: tracked.length });
}
