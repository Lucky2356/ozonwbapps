import { describe, it, expect } from 'vitest';
import { extractBrand, detectCategory, isAccessory, isAccessoryQuery } from './productmeta';

describe('extractBrand', () => {
  it('узнаёт известные бренды и алиасы', () => {
    expect(extractBrand('Смартфон Samsung Galaxy S24')).toBe('Samsung');
    expect(extractBrand('Apple iPhone 15 128GB')).toBe('Apple');
    expect(extractBrand('iPhone 13')).toBe('Apple'); // алиас
    expect(extractBrand('Смартфон Redmi Note 13')).toBe('Xiaomi'); // алиас
    expect(extractBrand('Ноутбук ASUS VivoBook')).toBe('ASUS');
  });

  it('пропускает модификаторы и берёт латинский токен как бренд', () => {
    expect(extractBrand('Pro Max ноутбук Acme X1')).toBe('Acme');
  });

  it('без латинских токенов — без бренда', () => {
    expect(extractBrand('Платье женское летнее')).toBeUndefined();
  });
});

describe('detectCategory', () => {
  it('распознаёт основные категории', () => {
    expect(detectCategory('Смартфон Samsung Galaxy S24')).toBe('Смартфоны');
    expect(detectCategory('Ноутбук ASUS')).toBe('Ноутбуки');
    expect(detectCategory('Наушники Sony WH-1000')).toBe('Наушники');
    expect(detectCategory('Телевизор LG 55')).toBe('Телевизоры');
    expect(detectCategory('Кроссовки Nike Air')).toBe('Обувь');
  });

  it('аксессуары имеют приоритет над товаром', () => {
    expect(detectCategory('Чехол для iPhone 15')).toBe('Аксессуары');
    expect(detectCategory('Защитное стекло Samsung Galaxy')).toBe('Аксессуары');
  });

  it('нераспознанное → Другое', () => {
    expect(detectCategory('Нечто непонятное 12345')).toBe('Другое');
  });
});

describe('isAccessory / isAccessoryQuery', () => {
  it('определяет аксессуары', () => {
    expect(isAccessory('Чехол для Samsung S24')).toBe(true);
    expect(isAccessory('Защитное стекло на iPhone')).toBe(true);
    expect(isAccessory('Кабель USB Type-C')).toBe(true);
    expect(isAccessory('Смартфон Samsung Galaxy S24')).toBe(false);
  });

  it('распознаёт запрос об аксессуаре', () => {
    expect(isAccessoryQuery('чехол samsung s24')).toBe(true);
    expect(isAccessoryQuery('телефон samsung')).toBe(false);
  });
});
