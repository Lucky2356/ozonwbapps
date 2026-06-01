import { describe, it, expect, vi, afterEach } from 'vitest';
import { WildberriesAdapter } from './wildberries';
import { SearchParams } from '@ozonwb/shared';

const fixture = {
  data: {
    products: [
      {
        id: 12345678,
        name: 'Смартфон Samsung Galaxy',
        supplier: 'Лучший Продавец',
        supplierRating: 4.9,
        reviewRating: 4.8,
        feedbacks: 1500,
        sizes: [{ price: { basic: 5000000, product: 4299000 } }], // копейки
      },
      {
        id: 999,
        name: 'Без цены',
        sizes: [{ price: {} }],
      },
    ],
  },
};

const baseParams: SearchParams = {
  query: 'телефон',
  marketplaces: ['wildberries'],
  filters: {},
  sort: 'best_value',
};

afterEach(() => vi.unstubAllGlobals());

describe('WildberriesAdapter', () => {
  it('нормализует товар: цена в рублях, рейтинг, отзывы, продавец, ссылка', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => fixture })),
    );

    const offers = await new WildberriesAdapter().search(baseParams);
    expect(offers).toHaveLength(1); // товар без цены отброшен

    const o = offers[0];
    expect(o.marketplace).toBe('wildberries');
    expect(o.price).toBe(42990); // 4299000 копеек -> рубли
    expect(o.oldPrice).toBe(50000);
    expect(o.discountPercent).toBe(14);
    expect(o.rating).toBe(4.8);
    expect(o.reviewsCount).toBe(1500);
    expect(o.sellerName).toBe('Лучший Продавец');
    expect(o.productUrl).toContain('/catalog/12345678/detail.aspx');
    expect(o.imageUrl).toContain('wbbasket.ru');
  });

  it('применяет фильтр по минимальному рейтингу', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => fixture })),
    );
    const offers = await new WildberriesAdapter().search({
      ...baseParams,
      filters: { minRating: 4.9 },
    });
    expect(offers).toHaveLength(0); // рейтинг 4.8 < 4.9
  });

  it('возвращает пустой список при ошибке сети, не бросая исключение', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const offers = await new WildberriesAdapter().search(baseParams);
    expect(offers).toEqual([]);
  });
});
