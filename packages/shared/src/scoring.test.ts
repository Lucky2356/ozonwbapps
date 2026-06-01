import { describe, it, expect } from 'vitest';
import { computeScores, sortOffers } from './scoring';
import { MarketplaceOffer } from './types';

const base: Omit<MarketplaceOffer, 'id' | 'price'> = {
  marketplace: 'wildberries',
  title: 'Товар',
  productUrl: 'https://example.com',
  availability: true,
  collectedAt: new Date().toISOString(),
};

function offer(id: string, price: number, extra: Partial<MarketplaceOffer> = {}): MarketplaceOffer {
  return { ...base, id, price, ...extra };
}

describe('computeScores', () => {
  it('возвращает score в диапазоне 0..100', () => {
    const scored = computeScores([
      offer('a', 1000, { rating: 4.8, reviewsCount: 500 }),
      offer('b', 2000, { rating: 4.2, reviewsCount: 50 }),
    ]);
    for (const s of scored) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  it('товар без отзывов не обгоняет товар с большим числом отзывов при прочих равных', () => {
    const scored = computeScores([
      offer('withReviews', 1000, { rating: 4.7, reviewsCount: 1500 }),
      offer('noReviews', 1000, { rating: 4.7, reviewsCount: 0 }),
    ]);
    const withReviews = scored.find((s) => s.id === 'withReviews')!;
    const noReviews = scored.find((s) => s.id === 'noReviews')!;
    expect(withReviews.score).toBeGreaterThan(noReviews.score);
    expect(noReviews.scoreReasons).toContain('Нет отзывов');
  });

  it('подозрительно низкая цена снижает доверие и добавляет предупреждение', () => {
    const scored = computeScores([
      offer('normal', 10000, { rating: 4.6, reviewsCount: 300 }),
      offer('normal2', 11000, { rating: 4.6, reviewsCount: 300 }),
      offer('suspicious', 1000, { rating: 4.6, reviewsCount: 300 }),
    ]);
    const suspicious = scored.find((s) => s.id === 'suspicious')!;
    expect(suspicious.scoreReasons.some((r) => r.includes('Подозрительно низкая цена'))).toBe(true);
  });

  it('объясняет, что цена ниже средней', () => {
    const scored = computeScores([
      offer('cheap', 800, { rating: 4.5, reviewsCount: 200 }),
      offer('expensive', 1200, { rating: 4.5, reviewsCount: 200 }),
    ]);
    const cheap = scored.find((s) => s.id === 'cheap')!;
    expect(cheap.scoreReasons.some((r) => r.startsWith('Цена ниже средней'))).toBe(true);
  });
});

describe('sortOffers', () => {
  it('best_value сортирует по убыванию score', () => {
    const scored = computeScores([
      offer('a', 1000, { rating: 4.9, reviewsCount: 2000 }),
      offer('b', 5000, { rating: 3.0, reviewsCount: 5 }),
    ]);
    const sorted = sortOffers(scored, 'best_value');
    expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[1].score);
  });

  it('price_asc сортирует по возрастанию цены', () => {
    const scored = computeScores([offer('a', 3000), offer('b', 1000), offer('c', 2000)]);
    const sorted = sortOffers(scored, 'price_asc');
    expect(sorted.map((s) => s.price)).toEqual([1000, 2000, 3000]);
  });
});
