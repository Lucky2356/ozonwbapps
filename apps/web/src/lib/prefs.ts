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

const RECENT_KEY = 'ozonwb:recent-queries';
const RECENT_MAX = 6;

/** Последние поисковые запросы (для быстрых чипов на главной). */
export function loadRecentQueries(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((q): q is string => typeof q === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

/** Добавляет запрос в историю (без дублей, последний — первым, максимум RECENT_MAX). */
export function pushRecentQuery(query: string): void {
  const q = query.trim();
  if (!q) return;
  try {
    const list = [q, ...loadRecentQueries().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
      0,
      RECENT_MAX,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* localStorage недоступен — не критично */
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
