import { describe, it, expect } from 'vitest';
import { escapeCsvField, toCsv } from './csv';

describe('escapeCsvField', () => {
  it('оставляет простые значения как есть', () => {
    expect(escapeCsvField('Samsung')).toBe('Samsung');
    expect(escapeCsvField(25990)).toBe('25990');
  });

  it('пустые значения → пустая строка', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('оборачивает в кавычки при наличии разделителя/кавычек/переноса', () => {
    expect(escapeCsvField('Чай; чёрный')).toBe('"Чай; чёрный"');
    expect(escapeCsvField('Кабель 1,5"')).toBe('"Кабель 1,5"""');
    expect(escapeCsvField('строка\nещё')).toBe('"строка\nещё"');
  });

  it('учитывает кастомный разделитель', () => {
    expect(escapeCsvField('a,b', ',')).toBe('"a,b"');
    expect(escapeCsvField('a,b', ';')).toBe('a,b'); // запятая не разделитель → не экранируем
  });
});

describe('toCsv', () => {
  it('собирает заголовок и строки через ; и CRLF', () => {
    const csv = toCsv(
      ['Название', 'Цена'],
      [
        ['Samsung Galaxy A52', 25990],
        ['iPhone 13', 59990],
      ],
    );
    expect(csv).toBe('Название;Цена\r\nSamsung Galaxy A52;25990\r\niPhone 13;59990');
  });

  it('экранирует значения с разделителем', () => {
    const csv = toCsv(['A', 'B'], [['есть; точка с запятой', 'ок']]);
    expect(csv).toBe('A;B\r\n"есть; точка с запятой";ок');
  });

  it('поддерживает кастомный разделитель', () => {
    const csv = toCsv(['A', 'B'], [['x', 'y']], { delimiter: ',' });
    expect(csv).toBe('A,B\r\nx,y');
  });
});
