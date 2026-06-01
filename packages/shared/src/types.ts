/**
 * Единая модель данных проекта. Все маркетплейсы приводятся к этим типам.
 */

/** Идентификатор маркетплейса. Строка — чтобы легко добавлять новые источники. */
export type MarketplaceId = 'ozon' | 'wildberries' | 'yandex_market' | 'dns' | (string & {});

/** Нормализованное предложение товара с любого маркетплейса. */
export interface MarketplaceOffer {
  /** Стабильный идентификатор предложения (обычно `${marketplace}:${externalId}`). */
  id: string;
  marketplace: MarketplaceId;
  title: string;
  /** Текущая цена в рублях. */
  price: number;
  /** Старая (зачёркнутая) цена в рублях. */
  oldPrice?: number;
  /** Процент скидки 0..100. */
  discountPercent?: number;
  /** Рейтинг товара 0..5. */
  rating?: number;
  reviewsCount?: number;
  sellerName?: string;
  /** Рейтинг продавца 0..5. */
  sellerRating?: number;
  imageUrl?: string;
  productUrl: string;
  availability: boolean;
  deliveryInfo?: string;
  /** ISO-дата сбора данных. */
  collectedAt: string;
}

/** Предложение с рассчитанной выгодностью. */
export interface ScoredOffer extends MarketplaceOffer {
  /** Итоговый балл выгодности 0..100. */
  score: number;
  /** Человекочитаемые причины, почему товар выгоден (на русском). */
  scoreReasons: string[];
}

export type SortOption = 'best_value' | 'price_asc' | 'price_desc' | 'rating' | 'reviews';

export interface SearchFilters {
  minRating?: number | null;
  minReviews?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}

/** Параметры, которые получает адаптер маркетплейса. */
export interface SearchParams {
  query: string;
  marketplaces: MarketplaceId[];
  filters: SearchFilters;
  sort: SortOption;
  /** Максимум товаров с одного маркетплейса. */
  maxItems?: number;
}

export type SearchStatus = 'processing' | 'completed' | 'failed';

/** Описание маркетплейса для фронтенда (GET /marketplaces). */
export interface MarketplaceInfo {
  id: MarketplaceId;
  name: string;
  enabled: boolean;
}
