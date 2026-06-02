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
  await prisma.priceHistory.create({ data: { trackedProductId: tp.id, price } });
  await prisma.trackedProduct.update({ where: { id: tp.id }, data: { lastPrice: price } });
  await maybeNotify(tp, prev, price);
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
 * - Целевой цены нет: уведомляем при снижении цены минимум на 1% относительно прошлой.
 */
export function decideNotification(
  prev: number | null,
  price: number,
  target: number | null,
): 'target_reached' | 'price_drop' | null {
  if (target != null) {
    if (price <= target && (prev == null || prev > target)) return 'target_reached';
    return null;
  }
  if (prev != null && price < prev * 0.99) return 'price_drop';
  return null;
}

/** Решает, нужно ли уведомление, и создаёт его (в приложении + в Telegram). */
async function maybeNotify(tp: TrackedWithUser, prev: number | null, price: number): Promise<void> {
  const target = tp.targetPrice ?? null;
  const type = decideNotification(prev, price, target);
  if (!type) return;

  const title = type === 'target_reached' ? 'Цель по цене достигнута' : 'Цена снизилась';
  const message =
    type === 'target_reached'
      ? `«${tp.title}» теперь ${fmt(price)} ₽ (цель ${fmt(target as number)} ₽).`
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
