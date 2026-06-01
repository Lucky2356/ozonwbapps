import { MarketplaceOffer, SearchFilters } from '@ozonwb/shared';

/** Применяет фильтры пользователя к списку предложений. */
export function applyFilters(
  offers: MarketplaceOffer[],
  filters: SearchFilters,
): MarketplaceOffer[] {
  return offers.filter((o) => {
    if (filters.minRating != null && (o.rating ?? 0) < filters.minRating) return false;
    if (filters.minReviews != null && (o.reviewsCount ?? 0) < filters.minReviews) return false;
    if (filters.minPrice != null && o.price < filters.minPrice) return false;
    if (filters.maxPrice != null && o.price > filters.maxPrice) return false;
    return true;
  });
}

/** Убирает дубли по productUrl (а при отсутствии — по marketplace+title). */
export function dedupe(offers: MarketplaceOffer[]): MarketplaceOffer[] {
  const seen = new Set<string>();
  const result: MarketplaceOffer[] = [];
  for (const o of offers) {
    const key = o.productUrl || `${o.marketplace}:${o.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(o);
  }
  return result;
}

/** Безопасное число (NaN/undefined -> undefined). */
export function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
