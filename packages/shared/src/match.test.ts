import { describe, it, expect } from 'vitest';
import {
  tokenizeTitle,
  titleSimilarity,
  groupOffers,
  searchQueryFromTitle,
  MatchableOffer,
} from './match';

describe('tokenizeTitle', () => {
  it('нормализует регистр, ё и пунктуацию, выкидывает стоп-слова', () => {
    const tokens = tokenizeTitle('Смартфон Samsung Galaxy A52, 128GB — Чёрный (для России)');
    expect(tokens).toContain('samsung');
    expect(tokens).toContain('galaxy');
    expect(tokens).toContain('a52');
    expect(tokens).toContain('128gb');
    expect(tokens).toContain('черный'); // ё → е
    expect(tokens).not.toContain('для'); // стоп-слово
  });

  it('сохраняет короткие токены с цифрами', () => {
    expect(tokenizeTitle('iPhone 13')).toEqual(['iphone', '13']);
  });
});

describe('titleSimilarity', () => {
  it('высокая схожесть у одного товара с разными формулировками', () => {
    const a = 'Смартфон Samsung Galaxy A52 128GB Чёрный';
    const b = 'Samsung Galaxy A52 128 ГБ чёрный смартфон';
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.5);
  });

  it('штрафует расхождение по объёму памяти', () => {
    const a = 'Samsung Galaxy A52 128GB чёрный';
    const b = 'Samsung Galaxy A52 256GB чёрный';
    expect(titleSimilarity(a, b)).toBeLessThan(0.45);
  });

  it('низкая схожесть у разных товаров', () => {
    const a = 'Смартфон Samsung Galaxy A52';
    const b = 'Наушники Sony WH-1000XM4';
    expect(titleSimilarity(a, b)).toBeLessThan(0.2);
  });

  it('пустые названия дают 0', () => {
    expect(titleSimilarity('', 'что-то')).toBe(0);
    expect(titleSimilarity('!!!', '???')).toBe(0);
  });
});

function offer(p: Partial<MatchableOffer> & { id: string; title: string; price: number; marketplace: string }): MatchableOffer {
  return p;
}

describe('searchQueryFromTitle', () => {
  it('берёт первые значимые токены без шума', () => {
    const q = searchQueryFromTitle('Смартфон Samsung Galaxy A52 128GB Чёрный для России', 4);
    expect(q).toBe('смартфон samsung galaxy a52');
  });

  it('ограничивает число токенов', () => {
    expect(searchQueryFromTitle('iPhone 13 Pro Max 256 ГБ', 3)).toBe('iphone 13 pro');
  });

  it('пустое/мусорное название → пустая строка', () => {
    expect(searchQueryFromTitle('!!!')).toBe('');
  });
});

describe('groupOffers', () => {
  it('объединяет один товар с разных маркетплейсов в группу', () => {
    const offers = [
      offer({ id: 'ozon:1', title: 'Смартфон Samsung Galaxy A52 128GB Чёрный', price: 25000, marketplace: 'ozon', reviewsCount: 1200 }),
      offer({ id: 'wb:1', title: 'Samsung Galaxy A52 128 ГБ чёрный смартфон', price: 23990, marketplace: 'wildberries', reviewsCount: 800 }),
      offer({ id: 'dns:1', title: 'Смартфон Samsung Galaxy A52 128 ГБ, чёрный', price: 26500, marketplace: 'dns', reviewsCount: 50 }),
    ];
    const groups = groupOffers(offers);
    expect(groups).toHaveLength(1);
    const g = groups[0];
    expect(g.marketplaceCount).toBe(3);
    expect(g.minPrice).toBe(23990);
    expect(g.maxPrice).toBe(26500);
    expect(g.savings).toBe(2510);
    expect(g.offers[0].marketplace).toBe('wildberries'); // дешевле всех — первый
    // Каноническое название — у оффера с наибольшим числом отзывов (ozon, 1200).
    expect(g.title).toContain('Samsung');
  });

  it('разделяет разные модификации (память) на разные группы', () => {
    const offers = [
      offer({ id: 'ozon:1', title: 'Samsung Galaxy A52 128GB чёрный', price: 25000, marketplace: 'ozon' }),
      offer({ id: 'wb:1', title: 'Samsung Galaxy A52 256GB чёрный', price: 29000, marketplace: 'wildberries' }),
    ];
    const groups = groupOffers(offers);
    expect(groups).toHaveLength(2);
  });

  it('сортирует группы: сначала больше маркетплейсов, затем больше экономии', () => {
    const offers = [
      // Группа из 1 маркетплейса, но с большой "экономией" внутри (два оффера одного МП).
      offer({ id: 'ozon:1', title: 'Наушники Sony WH-1000XM4', price: 20000, marketplace: 'ozon' }),
      offer({ id: 'ozon:2', title: 'Наушники Sony WH 1000XM4', price: 30000, marketplace: 'ozon' }),
      // Группа из 2 маркетплейсов с меньшей экономией.
      offer({ id: 'ozon:3', title: 'Кофеварка DeLonghi ECAM', price: 50000, marketplace: 'ozon' }),
      offer({ id: 'wb:3', title: 'Кофеварка DeLonghi ECAM', price: 49000, marketplace: 'wildberries' }),
    ];
    const groups = groupOffers(offers);
    expect(groups[0].marketplaceCount).toBe(2); // 2 МП идёт первой
    expect(groups[0].title).toContain('DeLonghi');
  });

  it('пустой вход — пустой выход', () => {
    expect(groupOffers([])).toEqual([]);
  });
});
