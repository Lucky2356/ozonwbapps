import { describe, it, expect } from 'vitest';
import { mapRawCards, RawCard } from './domscrape';

const ts = '2026-06-04T00:00:00.000Z';

function raw(p: Partial<RawCard>): RawCard {
  return { href: '', title: '', price: '', oldPrice: '', image: '', ...p };
}

describe('mapRawCards', () => {
  it('парсит цену с неразрывными пробелами и ₽, извлекает id по regex', () => {
    const offers = mapRawCards(
      [raw({ href: 'https://www.dns-shop.ru/product/abc-123/naushniki/', title: 'Наушники X', price: '5 990 ₽' })],
      { marketplace: 'dns', linkSelector: 'a', idRegex: '/product/([0-9a-z-]+)' },
      ts,
    );
    expect(offers).toHaveLength(1);
    expect(offers[0].id).toBe('dns:abc-123');
    expect(offers[0].price).toBe(5990);
    expect(offers[0].productUrl).toContain('/product/abc-123');
  });

  it('считает скидку, когда старая цена больше текущей', () => {
    const [o] = mapRawCards(
      [raw({ href: 'https://x/product/1', title: 'Товар', price: '8 000 ₽', oldPrice: '10 000 ₽' })],
      { marketplace: 'mvideo', linkSelector: 'a' },
      ts,
    );
    expect(o.oldPrice).toBe(10000);
    expect(o.discountPercent).toBe(20);
  });

  it('игнорирует старую цену, если она не больше текущей', () => {
    const [o] = mapRawCards(
      [raw({ href: 'https://x/p/1', title: 'Товар', price: '8 000 ₽', oldPrice: '7 000 ₽' })],
      { marketplace: 'citilink', linkSelector: 'a' },
      ts,
    );
    expect(o.oldPrice).toBeUndefined();
    expect(o.discountPercent).toBeUndefined();
  });

  it('отбрасывает карточки без распознанной цены', () => {
    const offers = mapRawCards(
      [raw({ href: 'https://x/p/1', title: 'Без цены', price: 'нет в наличии' })],
      { marketplace: 'megamarket', linkSelector: 'a' },
      ts,
    );
    expect(offers).toHaveLength(0);
  });

  it('без idRegex использует href как id', () => {
    const [o] = mapRawCards(
      [raw({ href: 'https://x/item', title: 'Т', price: '100 ₽' })],
      { marketplace: 'yandex_market', linkSelector: 'a' },
      ts,
    );
    expect(o.id).toBe('yandex_market:https://x/item');
  });
});
