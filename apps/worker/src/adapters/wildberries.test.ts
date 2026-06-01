import { describe, it, expect } from 'vitest';
import { normalizeWbProduct, salvageJson, wbImageUrl } from './wildberries';

const collectedAt = new Date().toISOString();

describe('normalizeWbProduct', () => {
  it('нормализует товар: цена в рублях, скидка, рейтинг, отзывы, продавец, ссылка', () => {
    const o = normalizeWbProduct(
      {
        id: 12345678,
        name: 'Смартфон Samsung Galaxy',
        supplier: 'Лучший Продавец',
        supplierRating: 4.9,
        reviewRating: 4.8,
        feedbacks: 1500,
        sizes: [{ price: { basic: 5000000, product: 4299000 } }], // копейки
      },
      collectedAt,
    )!;
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

  it('отбрасывает товар без цены', () => {
    expect(normalizeWbProduct({ id: 999, name: 'Без цены', sizes: [{ price: {} }] }, collectedAt)).toBeNull();
  });

  it('отбрасывает запись без id', () => {
    expect(normalizeWbProduct({ name: 'Нет id' }, collectedAt)).toBeNull();
  });
});

describe('salvageJson', () => {
  it('спасает валидную часть при мусорном хвосте анти-бота WB', () => {
    const good = JSON.stringify({ data: { products: [{ id: 1 }] } });
    const broken = good + ',ot Found'; // как реально присылает WB
    const parsed = salvageJson(broken);
    expect(parsed?.data?.products?.[0]?.id).toBe(1);
  });

  it('возвращает null, если JSON не спасти', () => {
    expect(salvageJson('<html>403</html>')).toBeNull();
  });
});

describe('wbImageUrl', () => {
  it('строит basket-URL по id', () => {
    expect(wbImageUrl(12345678)).toMatch(
      /^https:\/\/basket-\d{2}\.wbbasket\.ru\/vol\d+\/part\d+\/12345678\/images\//,
    );
  });
});
