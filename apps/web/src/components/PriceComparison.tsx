import { useMemo, useState, type ReactNode } from 'react';
import { ExternalLink, Star, ChevronDown, Pin } from 'lucide-react';
import clsx from 'clsx';
import { groupOffers } from '@ozonwb/shared';
import { buildImageCandidates, formatPrice, marketplaceColor, marketplaceLabel } from '../lib/format';

/** Минимум полей, нужный для сравнения. Под него подходят и ResultItem, и (после маппинга) Favorite. */
export interface ComparisonItem {
  id: string;
  title: string;
  price: number;
  marketplace: string;
  productUrl: string;
  imageUrl?: string | null;
  rating?: number | null;
  reviewsCount?: number;
}

interface Props<T extends ComparisonItem> {
  items: T[];
  /** Доп. действия для строки оффера (избранное/трекинг/удаление) — рендерятся перед «Открыть». */
  renderActions?: (item: T) => ReactNode;
  emptyHint?: string;
}

type GroupSort = 'savings' | 'price' | 'title';

const GROUP_SORTS: { value: GroupSort; label: string }[] = [
  { value: 'savings', label: 'По выгоде' },
  { value: 'price', label: 'По минимальной цене' },
  { value: 'title', label: 'По названию' },
];

/** Картинка группы (первая доступная среди офферов, с фолбэком basket-хостов WB). */
function GroupImage<T extends ComparisonItem>({ items }: { items: T[] }) {
  const candidates = useMemo(() => {
    const withImg = items.find((i) => i.imageUrl);
    return buildImageCandidates(withImg?.imageUrl ?? undefined);
  }, [items]);
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
        нет фото
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={items[0]?.title}
      loading="lazy"
      className="h-full w-full object-contain"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

function OfferRow<T extends ComparisonItem>({
  offer,
  cheapest,
  isReference,
  onSetReference,
  renderActions,
}: {
  offer: T;
  cheapest: boolean;
  isReference: boolean;
  onSetReference: () => void;
  renderActions?: (item: T) => ReactNode;
}) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-lg border px-3 py-2',
        cheapest
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/60 dark:bg-emerald-900/20'
          : 'border-slate-200 dark:border-slate-700',
      )}
    >
      <span
        className={clsx(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
          marketplaceColor(offer.marketplace),
        )}
      >
        {marketplaceLabel(offer.marketplace)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold">{formatPrice(offer.price)}</span>
          {cheapest && (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              дешевле всего
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {offer.rating != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {offer.rating.toFixed(1)}
            </span>
          )}
          {offer.reviewsCount != null && <span>{offer.reviewsCount} отз.</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onSetReference}
          className={clsx('btn-ghost px-2', isReference && 'text-brand')}
          title={isReference ? 'Это название группы' : 'Сделать названием группы'}
          aria-label="Сделать эталонным названием группы"
          aria-pressed={isReference}
        >
          <Pin className={clsx('h-4 w-4', isReference && 'fill-current')} />
        </button>
        {renderActions?.(offer)}
        <a
          href={offer.productUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary px-2.5 text-xs"
          aria-label="Открыть товар на маркетплейсе"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export function PriceComparison<T extends ComparisonItem>({ items, renderActions, emptyHint }: Props<T>) {
  const [groupSort, setGroupSort] = useState<GroupSort>('savings');
  const [onlySavings, setOnlySavings] = useState(false);
  // Переопределение эталонного оффера группы (id группы -> id оффера).
  const [refs, setRefs] = useState<Record<string, string>>({});

  const groups = useMemo(() => groupOffers(items), [items]);
  // Группы с реальным сравнением (2+ маркетплейса).
  const comparedBase = useMemo(() => groups.filter((g) => g.marketplaceCount > 1), [groups]);
  const singles = useMemo(() => groups.filter((g) => g.marketplaceCount <= 1), [groups]);

  const compared = useMemo(() => {
    let list = comparedBase;
    if (onlySavings) list = list.filter((g) => g.savings > 0);
    const sorted = [...list];
    if (groupSort === 'price') sorted.sort((a, b) => a.minPrice - b.minPrice);
    else if (groupSort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    else sorted.sort((a, b) => b.savings - a.savings);
    return sorted;
  }, [comparedBase, onlySavings, groupSort]);

  if (comparedBase.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
        {emptyHint ??
          'Не нашлось одинаковых товаров на разных маркетплейсах для сравнения. Попробуйте выбрать несколько маркетплейсов в поиске или уточнить запрос.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={onlySavings}
            onChange={(e) => setOnlySavings(e.target.checked)}
          />
          Только с экономией
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Сортировка
          <select
            className="input w-auto py-1.5"
            value={groupSort}
            onChange={(e) => setGroupSort(e.target.value as GroupSort)}
          >
            {GROUP_SORTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {compared.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
          Среди сравнений нет товаров с разницей в цене.
        </div>
      ) : (
        compared.map((g) => {
          const refId = refs[g.id];
          const refOffer = refId ? g.offers.find((o) => o.id === refId) : undefined;
          const title = refOffer?.title ?? g.title;
          return (
            <div key={g.id} className="card overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <GroupImage items={g.offers} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold" title={title}>
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {g.marketplaceCount} маркетплейса · цены от{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatPrice(g.minPrice)}
                    </span>{' '}
                    до {formatPrice(g.maxPrice)}
                  </p>
                  {g.savings > 0 && (
                    <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Экономия до {formatPrice(g.savings)} ({g.savingsPercent}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-700/60">
                {g.offers.map((offer, i) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    cheapest={i === 0 && g.savings > 0}
                    isReference={offer.id === (refId ?? g.offers.find((o) => o.title === g.title)?.id)}
                    onSetReference={() => setRefs((m) => ({ ...m, [g.id]: offer.id }))}
                    renderActions={renderActions}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {singles.length > 0 && <SinglesNote count={singles.length} />}
    </div>
  );
}

/** Свёртка-подсказка про товары без пары для сравнения. */
function SinglesNote({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-500"
      >
        <span>Ещё {count} товаров без пары для сравнения</span>
        <ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="px-4 pb-3 text-xs text-slate-400">
          Эти товары нашлись только на одном маркетплейсе или не совпали по названию с другими.
          Переключитесь на режим «Списком», чтобы увидеть их все.
        </p>
      )}
    </div>
  );
}
