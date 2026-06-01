/** Redis-кеш нормализованных результатов парсинга (анти-агрессивный парсинг). */
import Redis from 'ioredis';
import { MarketplaceOffer } from '@ozonwb/shared';
import { config } from './config';
import { logger } from './logger';

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

export async function getCached(
  marketplace: string,
  query: string,
): Promise<MarketplaceOffer[] | null> {
  try {
    const raw = await redis.get(key(marketplace, query));
    return raw ? (JSON.parse(raw) as MarketplaceOffer[]) : null;
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
    await redis.set(key(marketplace, query), JSON.stringify(offers), 'EX', config.cacheTtlSeconds);
  } catch (e) {
    logger.warn('Ошибка записи кеша', { error: String(e) });
  }
}
