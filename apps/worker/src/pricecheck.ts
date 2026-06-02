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
 * Пересбор цен всех отслеживаемых товаров: для каждого получает текущую цену через адаптер,
 * дописывает точку в историю цен, обновляет lastPrice и при необходимости создаёт уведомление
 * (в приложении + в Telegram). Изолирует ошибки по каждому товару — один сбой не ломает остальные.
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
    const adapter = resolveAdapters([tp.marketplace])[0];
    if (!adapter?.fetchProductPrice) continue; // маркетплейс выключен или не умеет отдавать цену

    let price: number | null = null;
    try {
      price = await getLimiter(tp.marketplace).schedule(() => adapter.fetchProductPrice!(tp.productUrl));
    } catch (e) {
      logger.warn('Трекинг цен: ошибка получения цены', { id: tp.id, error: String(e) });
    }
    if (price == null) continue;

    const prev = tp.lastPrice;
    await prisma.priceHistory.create({ data: { trackedProductId: tp.id, price } });
    await prisma.trackedProduct.update({ where: { id: tp.id }, data: { lastPrice: price } });
    checked++;

    await maybeNotify(tp, prev, price);
  }

  logger.info('Трекинг цен: проверка завершена', { checked, total: tracked.length });
}

/**
 * Решает, нужно ли уведомление, и создаёт его.
 * - Есть целевая цена: уведомляем при ПЕРВОМ достижении (пересечении) цели сверху вниз.
 * - Целевой цены нет: уведомляем при снижении цены минимум на 1% относительно прошлой.
 */
async function maybeNotify(tp: TrackedWithUser, prev: number | null, price: number): Promise<void> {
  const target = tp.targetPrice ?? null;

  let type: 'target_reached' | 'price_drop' | null = null;
  if (target != null) {
    if (price <= target && (prev == null || prev > target)) type = 'target_reached';
  } else if (prev != null && price < prev * 0.99) {
    type = 'price_drop';
  }
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
