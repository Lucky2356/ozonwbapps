/**
 * Генерация CSV. Чистая логика (без I/O) — покрыта юнит-тестами, переиспользуется на фронте
 * (там добавляется BOM и скачивание файла).
 *
 * По умолчанию разделитель — точка с запятой: русскоязычный Excel ожидает именно его как
 * разделитель списка, иначе строка попадает в одну ячейку.
 */

export type CsvCell = string | number | null | undefined;

/** Экранирует одно поле CSV: оборачивает в кавычки, если есть разделитель, кавычки или перенос строки. */
export function escapeCsvField(value: CsvCell, delimiter = ';'): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(delimiter) || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export interface CsvOptions {
  /** Разделитель полей. По умолчанию ';' (русский Excel). */
  delimiter?: string;
}

/**
 * Собирает CSV-текст из заголовков и строк.
 * Строки разделяются CRLF (совместимо с Excel). BOM не добавляется — это делает вызывающий код.
 */
export function toCsv(headers: string[], rows: CsvCell[][], options: CsvOptions = {}): string {
  const delimiter = options.delimiter ?? ';';
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeCsvField(cell, delimiter)).join(delimiter),
  );
  return lines.join('\r\n');
}
