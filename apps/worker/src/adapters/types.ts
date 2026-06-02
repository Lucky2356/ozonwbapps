import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';

/** Единый интерфейс адаптера маркетплейса. Новый источник = новая реализация. */
export interface MarketplaceAdapter {
  /** Идентификатор маркетплейса (совпадает с MarketplaceId). */
  readonly marketplaceName: string;
  /**
   * Поиск товаров. Должен:
   * - применять доступные фильтры;
   * - возвращать данные в едином формате MarketplaceOffer;
   * - не бросать исключения наружу без необходимости (ошибки логируются вызывающим кодом).
   */
  search(params: SearchParams): Promise<MarketplaceOffer[]>;

  /**
   * Текущая цена одного товара по его URL (в рублях) — для пересбора истории цен.
   * Возвращает null, если получить цену не удалось (анти-бот, товара нет и т.п.).
   * Необязателен: адаптеры без него просто не участвуют в трекинге цен.
   */
  fetchProductPrice?(productUrl: string): Promise<number | null>;
}
