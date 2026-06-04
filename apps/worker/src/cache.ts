/** Redis-кеш нормализованных результатов парсинга (анти-агрессивный парсинг). */
import Redis from 'ioredis';
import { MarketplaceOffer } from '@ozonwb/shared';
import { config } from './config';
import { logger } from './logger';

export { isStale } from './cache-policy';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
  // Не «ронять» процесс при кратковременной недоступности Redis.
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

// Без этого обработчика ioredis печатает "Unhandled error event" при недоступности Redis.
redis.on('error', (e) => logger.warn('Redis: ошибка соединения', { error: String(e) }));

function key(marketplace: string, query: string): string {
  return `parser:${marketplace}:${query.trim().toLowerCase()}`;
}

export interface CachedEntry {
  offers: MarketplaceOffer[];
  /** Возраст записи в миллисекундах. */
  ageMs: number;
}

export async function getCached(marketplace: string, query: string): Promise<CachedEntry | null> {
  try {
    const raw = await redis.get(key(marketplace, query));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Совместимость со старым форматом (просто массив) — считаем устаревшим.
    if (Array.isArray(parsed)) return { offers: parsed as MarketplaceOffer[], ageMs: Number.MAX_SAFE_INTEGER };
    return { offers: (parsed.offers ?? []) as MarketplaceOffer[], ageMs: Date.now() - (parsed.ts ?? 0) };
  } catch (e) {
    logger.warn('Ошибка чтения кеша', { error: String(e) });
    return null;
  }
}

export async function setCached(
  marketplace: string,
  query: string,
  offers: MarketplaceOffer[],
): Promise<void> {
  try {
    const payload = JSON.stringify({ offers, ts: Date.now() });
    await redis.set(key(marketplace, query), payload, 'EX', config.cacheTtlSeconds);
  } catch (e) {
    logger.warn('Ошибка записи кеша', { error: String(e) });
  }
}
