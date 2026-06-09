import { extractBrand, detectCategory, isAccessory, isAccessoryQuery } from '@ozonwb/shared';
import type { ResultItem } from '../api/types';

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  brands: FacetValue[];
  categories: FacetValue[];
  marketplaces: FacetValue[];
  priceMin: number;
  priceMax: number;
  discountCount: number;
  accessoryCount: number;
}

export interface FacetSelection {
  brands: string[];
  categories: string[];
  marketplaces: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  onlyDiscount: boolean;
  excludeAccessories: boolean;
}

export const EMPTY_SELECTION: FacetSelection = {
  brands: [],
  categories: [],
  marketplaces: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  onlyDiscount: false,
  excludeAccessories: false,
};

export function hasActiveFilters(s: FacetSelection): boolean {
  return (
    s.brands.length > 0 ||
    s.categories.length > 0 ||
    s.marketplaces.length > 0 ||
    s.minPrice != null ||
    s.maxPrice != null ||
    s.minRating != null ||
    s.onlyDiscount ||
    s.excludeAccessories
  );
}

function bump(map: Map<string, number>, key: string | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toSorted(map: Map<string, number>): FacetValue[] {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ru'));
}

/** Считает фасеты из набора товаров (бренды/категории/маркетплейсы/цена/скидки/аксессуары). */
export function buildFacets(items: ResultItem[]): Facets {
  const brands = new Map<string, number>();
  const categories = new Map<string, number>();
  const marketplaces = new Map<string, number>();
  let priceMin = Infinity;
  let priceMax = 0;
  let discountCount = 0;
  let accessoryCount = 0;

  for (const it of items) {
    bump(brands, extractBrand(it.title));
    bump(categories, detectCategory(it.title));
    bump(marketplaces, it.marketplace);
    if (it.price < priceMin) priceMin = it.price;
    if (it.price > priceMax) priceMax = it.price;
    if (it.discountPercent && it.discountPercent > 0) discountCount++;
    if (isAccessory(it.title)) accessoryCount++;
  }

  return {
    brands: toSorted(brands),
    categories: toSorted(categories),
    marketplaces: toSorted(marketplaces),
    priceMin: Number.isFinite(priceMin) ? priceMin : 0,
    priceMax,
    discountCount,
    accessoryCount,
  };
}

/** Применяет выбранные фасеты к товарам. query нужен, чтобы не резать аксессуары при поиске аксессуара. */
export function applyFacets(items: ResultItem[], sel: FacetSelection, query: string): ResultItem[] {
  const accessoryQuery = isAccessoryQuery(query);
  return items.filter((it) => {
    if (sel.brands.length) {
      const b = extractBrand(it.title);
      if (!b || !sel.brands.includes(b)) return false;
    }
    if (sel.categories.length && !sel.categories.includes(detectCategory(it.title))) return false;
    if (sel.marketplaces.length && !sel.marketplaces.includes(it.marketplace)) return false;
    if (sel.minPrice != null && it.price < sel.minPrice) return false;
    if (sel.maxPrice != null && it.price > sel.maxPrice) return false;
    if (sel.minRating != null && (it.rating ?? 0) < sel.minRating) return false;
    if (sel.onlyDiscount && !(it.discountPercent && it.discountPercent > 0)) return false;
    if (sel.excludeAccessories && !accessoryQuery && isAccessory(it.title)) return false;
    return true;
  });
}
