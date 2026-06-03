import { toCsv } from '@ozonwb/shared';
import type { ResultItem, Favorite } from '../api/types';
import { marketplaceLabel } from './format';

/** Скачивает CSV-текст как файл. Добавляет UTF-8 BOM — чтобы кириллица корректно открывалась в Excel. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Безопасное имя файла из произвольного текста (запрос пользователя и т.п.). */
export function safeFileName(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'export'
  );
}

const RESULT_HEADERS = [
  'Маркетплейс',
  'Название',
  'Цена',
  'Старая цена',
  'Скидка %',
  'Рейтинг',
  'Отзывов',
  'Балл выгодности',
  'Ссылка',
];

export function resultsToCsv(items: ResultItem[]): string {
  const rows = items.map((i) => [
    marketplaceLabel(i.marketplace),
    i.title,
    i.price,
    i.oldPrice ?? '',
    i.discountPercent ?? '',
    i.rating ?? '',
    i.reviewsCount ?? '',
    i.score,
    i.productUrl,
  ]);
  return toCsv(RESULT_HEADERS, rows);
}

const FAVORITE_HEADERS = ['Маркетплейс', 'Название', 'Цена', 'Старая цена', 'Рейтинг', 'Ссылка'];

export function favoritesToCsv(items: Favorite[]): string {
  const rows = items.map((f) => [
    marketplaceLabel(f.marketplace),
    f.title,
    f.price,
    f.oldPrice ?? '',
    f.rating ?? '',
    f.productUrl,
  ]);
  return toCsv(FAVORITE_HEADERS, rows);
}
