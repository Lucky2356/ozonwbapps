import type { SortOption, ResultItem } from '../api/types';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'best_value', label: 'Сначала самые выгодные' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'reviews', label: 'По количеству отзывов' },
];

/** Клиентская сортировка результатов (для пересортировки без нового запроса). */
export function sortResults(items: ResultItem[], sort: SortOption): ResultItem[] {
  const copy = [...items];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'reviews':
      return copy.sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
    case 'best_value':
    default:
      return copy.sort((a, b) => b.score - a.score);
  }
}
