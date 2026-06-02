export function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

const MARKETPLACE_LABELS: Record<string, string> = {
  ozon: 'Ozon',
  wildberries: 'Wildberries',
  yandex_market: 'Яндекс Маркет',
  dns: 'DNS',
};

export function marketplaceLabel(id: string): string {
  return MARKETPLACE_LABELS[id] ?? id;
}

export function marketplaceColor(id: string): string {
  switch (id) {
    case 'ozon':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'wildberries':
      return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300';
    case 'yandex_market':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

/**
 * Список запасных URL картинки.
 *
 * Картинки Wildberries лежат на basket-хостах (`basket-NN.wbbasket.ru`), номер которых
 * зависит от диапазона `vol` и периодически меняется WB. Если хост угадан неверно — картинка
 * не грузится. Поэтому для WB-URL формируем кандидатов по всем известным basket-хостам
 * (и обоим доменам — wbbasket.ru и wb.ru): фронт перебирает их при ошибке загрузки.
 * Оригинальный URL идёт первым; ближайшие по номеру хосты — следом (чаще всего верный сосед).
 */
export function buildImageCandidates(url?: string | null): string[] {
  if (!url) return [];
  const m = url.match(/^https:\/\/basket-(\d+)\.(wbbasket\.ru|wb\.ru)(\/.*)$/);
  if (!m) return [url];

  const origNum = Number(m[1]);
  const origin = m[2];
  const path = m[3];
  const MAX_BASKET = 30;

  // Порядок номеров хостов: оригинал, затем по возрастанию удаления от него.
  const nums = [origNum];
  for (let d = 1; d <= MAX_BASKET; d++) {
    if (origNum - d >= 1) nums.push(origNum - d);
    if (origNum + d <= MAX_BASKET) nums.push(origNum + d);
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  // Сначала домен из оригинала, потом второй — на случай смены домена WB.
  const origins = origin === 'wbbasket.ru' ? ['wbbasket.ru', 'wb.ru'] : ['wb.ru', 'wbbasket.ru'];
  for (const n of nums) {
    for (const o of origins) {
      const candidate = `https://basket-${String(n).padStart(2, '0')}.${o}${path}`;
      if (!seen.has(candidate)) {
        seen.add(candidate);
        candidates.push(candidate);
      }
    }
  }
  return candidates;
}
