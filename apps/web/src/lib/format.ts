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
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}
