import type { SearchFormValues, SortOption } from '../api/types';

/**
 * Запоминание последних параметров поиска в localStorage — чтобы пользователю не выбирать
 * каждый раз заново маркетплейсы/сортировку/фильтры. Сам запрос (query) не сохраняем.
 */
const KEY = 'ozonwb:search-prefs';

export type SearchPrefs = Pick<
  SearchFormValues,
  'marketplaces' | 'sort' | 'minRating' | 'minReviews' | 'minPrice' | 'maxPrice'
>;

const VALID_SORTS: SortOption[] = ['best_value', 'price_asc', 'price_desc', 'rating', 'reviews'];

export function loadPrefs(): Partial<SearchPrefs> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SearchPrefs>;
    const prefs: Partial<SearchPrefs> = {};
    if (Array.isArray(parsed.marketplaces)) {
      prefs.marketplaces = parsed.marketplaces.filter((m): m is string => typeof m === 'string');
    }
    if (parsed.sort && VALID_SORTS.includes(parsed.sort)) prefs.sort = parsed.sort;
    for (const k of ['minRating', 'minReviews', 'minPrice', 'maxPrice'] as const) {
      const v = parsed[k];
      if (typeof v === 'number' && Number.isFinite(v)) prefs[k] = v;
    }
    return prefs;
  } catch {
    return null;
  }
}

export function savePrefs(values: SearchFormValues): void {
  try {
    const prefs: SearchPrefs = {
      marketplaces: values.marketplaces,
      sort: values.sort,
      minRating: values.minRating ?? null,
      minReviews: values.minReviews ?? null,
      minPrice: values.minPrice ?? null,
      maxPrice: values.maxPrice ?? null,
    };
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* localStorage недоступен — не критично */
  }
}
