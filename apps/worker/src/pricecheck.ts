import { prisma } from '@ozonwb/db';
import { resolveAdapters } from './adapters/registry';
import { getLimiter } from './ratelimit';
import { logger } from './logger';
import { sendTelegram } from './notify';

type TrackedWithUser = Awaited<ReturnType<typeof loadTracked>>[number];

function loadTracked() {
  return prisma.trackedProduct.findMany({ include: { user: true } });
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

/**
 * Проверяет цену ОДНОГО отслеживаемого товара: получает текущую цену через адаптер,
 * дописывает точку в историю, обновляет lastPrice и при необходимости создаёт уведомление.
 * Возвращает true, если цену удалось получить и записать. Ошибки изолированы (не бросает).
 */
export async function checkTrackedPrice(tp: TrackedWithUser): Promise<boolean> {
  const adapter = resolveAdapters([tp.marketplace])[0];
  if (!adapter?.fetchProductPrice) return false; // маркетплейс выключен или не умеет отдавать цену

  let price: number | null = null;
  try {
    price = await getLimiter(tp.marketplace).schedule(() => adapter.fetchProductPrice!(tp.productUrl));
  } catch (e) {
    logger.warn('Трекинг цен: ошибка получения цены', { id: tp.id, error: String(e) });
  }
  if (price == null) return false;

  const prev = tp.lastPrice;
  // Исторический минимум считаем ДО вставки новой точки.
  const agg = await prisma.priceHistory.aggregate({
    where: { trackedProductId: tp.id },
    _min: { price: true },
  });
  const historicalMin = agg._min.price ?? null;

  await prisma.priceHistory.create({ data: { trackedProductId: tp.id, price } });
  await prisma.trackedProduct.update({ where: { id: tp.id }, data: { lastPrice: price } });
  await maybeNotify(tp, prev, price, historicalMin);
  return true;
}

/** Проверяет цену одного товара по его id (для очереди разовой проверки из API). */
export async function checkTrackedPriceById(trackedProductId: string): Promise<boolean> {
  const tp = await prisma.trackedProduct.findUnique({
    where: { id: trackedProductId },
    include: { user: true },
  });
  if (!tp) {
    logger.warn('Трекинг цен: товар не найден', { trackedProductId });
    return false;
  }
  return checkTrackedPrice(tp);
}

/**
 * Пересбор цен ВСЕХ отслеживаемых товаров (для cron). Один сбой не ломает остальные.
 */
export async function checkAllTrackedPrices(): Promise<void> {
  const tracked = await loadTracked();
  if (tracked.length === 0) {
    logger.info('Трекинг цен: нет отслеживаемых товаров');
    return;
  }
  logger.info('Трекинг цен: запускаю проверку', { count: tracked.length });

  let checked = 0;
  for (const tp of tracked) {
    if (await checkTrackedPrice(tp)) checked++;
  }

  logger.info('Трекинг цен: проверка завершена', { checked, total: tracked.length });
}

/**
 * Чистое решение, нужно ли уведомление (вынесено для юнит-тестов).
 * - Есть целевая цена: уведомляем при ПЕРВОМ достижении (пересечении) цели сверху вниз.
 * - Целевой цены нет:
 *   - новый исторический минимум (price ниже всех прежних) при снижении → 'historical_low';
 *   - иначе снижение не меньше порога thresholdPercent относительно прошлой → 'price_drop'.
 */
export function decideNotification(
  prev: number | null,
  price: number,
  target: number | null,
  thresholdPercent = 1,
  isHistoricalLow = false,
): 'target_reached' | 'price_drop' | 'historical_low' | null {
  if (target != null) {
    if (price <= target && (prev == null || prev > target)) return 'target_reached';
    return null;
  }
  if (prev == null || price >= prev) return null;
  if (isHistoricalLow) return 'historical_low';
  if (price < prev * (1 - thresholdPercent / 100)) return 'price_drop';
  return null;
}

/** Решает, нужно ли уведомление, и создаёт его (в приложении + в Telegram). */
async function maybeNotify(
  tp: TrackedWithUser,
  prev: number | null,
  price: number,
  historicalMin: number | null,
): Promise<void> {
  const target = tp.targetPrice ?? null;
  const threshold = tp.user.priceDropThresholdPercent ?? 1;
  const isHistoricalLow = historicalMin != null && price < historicalMin;
  const type = decideNotification(prev, price, target, threshold, isHistoricalLow);
  if (!type) return;

  const title =
    type === 'target_reached'
      ? 'Цель по цене достигнута'
      : type === 'historical_low'
        ? 'Исторический минимум цены'
        : 'Цена снизилась';
  const message =
    type === 'target_reached'
      ? `«${tp.title}» теперь ${fmt(price)} ₽ (цель ${fmt(target as number)} ₽).`
      : type === 'historical_low'
        ? `«${tp.title}» сейчас дешевле, чем когда-либо: ${fmt(price)} ₽${prev != null ? ` (было ${fmt(prev)} ₽)` : ''}.`
        : `«${tp.title}» подешевел: ${prev != null ? fmt(prev) : '—'} ₽ → ${fmt(price)} ₽.`;

  await prisma.notification.create({
    data: {
      userId: tp.userId,
      type,
      title,
      message,
      trackedProductId: tp.id,
      productUrl: tp.productUrl,
    },
  });

  if (tp.user.telegramChatId) {
    await sendTelegram(tp.user.telegramChatId, `<b>${title}</b>\n${message}\n${tp.productUrl}`);
  }

  logger.info('Трекинг цен: создано уведомление', { id: tp.id, type });
}
