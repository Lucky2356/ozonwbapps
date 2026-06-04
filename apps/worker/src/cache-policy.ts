import { config } from './config';

/**
 * Пора ли обновлять кэш в фоне (запись старше «мягкого» TTL) — stale-while-revalidate.
 * Чистая функция без I/O (вынесена из cache.ts, чтобы тест не поднимал соединение с Redis).
 */
export function isStale(ageMs: number, softTtlSeconds: number = config.cacheSoftTtlSeconds): boolean {
  return ageMs > softTtlSeconds * 1000;
}
