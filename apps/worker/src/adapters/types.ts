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
}
