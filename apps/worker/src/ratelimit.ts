/** Лимиты запросов на маркетплейс — чтобы парсить вежливо. */
import Bottleneck from 'bottleneck';
import { config } from './config';

const limiters = new Map<string, Bottleneck>();

export function getLimiter(marketplace: string): Bottleneck {
  let limiter = limiters.get(marketplace);
  if (!limiter) {
    limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: config.requestDelayMs, // минимальная пауза между запросами
    });
    limiters.set(marketplace, limiter);
  }
  return limiter;
}
