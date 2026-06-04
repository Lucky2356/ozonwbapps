import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Info, LayoutGrid, Scale, Download, X, Heart, Bell } from 'lucide-react';
import clsx from 'clsx';
import {
  useSearchStatus,
  useSearchResults,
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
  useAddTracked,
} from '../api/hooks';
import { ProductCard } from '../components/ProductCard';
import { PriceComparison } from '../components/PriceComparison';
import { TrackDialog } from '../components/TrackDialog';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { SkeletonGrid } from '../components/SkeletonCard';
import { ScoreLegend } from '../components/ScoreLegend';
import { marketplaceColor, marketplaceLabel } from '../lib/format';
import { SORT_OPTIONS, sortResults } from '../lib/sort';
import { downloadCsv, resultsToCsv, safeFileName } from '../lib/export';
import { toast } from '../store/toast';
import type { ResultItem, SortOption } from '../api/types';

export function ResultsPage() {
  const { searchId } = useParams<{ searchId: string }>();
  const status = useSearchStatus(searchId);
  const ready = status.data?.status === 'completed';
  const results = useSearchResults(searchId, ready);

  const favorites = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const addTracked = useAddTracked();

  const [sort, setSort] = useState<SortOption>('best_value');
  const [showLegend, setShowLegend] = useState(false);
  const [view, setView] = useState<'list' | 'compare'>('list');
  const [filterText, setFilterText] = useState('');
  const [visibleCount, setVisibleCount] = useState(24);
  const [trackItem, setTrackItem] = useState<ResultItem | null>(null);

  // Сбрасываем пагинацию при смене фильтра/сортировки.
  useEffect(() => setVisibleCount(24), [filterText, sort]);

  const favByUrl = new Map((favorites.data ?? []).map((f) => [f.productUrl, f.id]));

  const allItems = results.data?.results ?? [];
  // Быстрый клиентский фильтр по словам из названия (все слова должны встретиться).
  const items = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return allItems;
    const terms = q.split(/\s+/);
    return allItems.filter((i) => {
      const title = i.title.toLowerCase();
      return terms.every((t) => title.includes(t));
    });
  }, [allItems, filterText]);
  const sortedItems = useMemo(() => sortResults(items, sort), [items, sort]);
  const minPrice = useMemo(
    () => (items.length ? Math.min(...items.map((i) => i.price)) : 0),
    [items],
  );

  const toggleFavorite = (item: ResultItem) => {
    const existingId = favByUrl.get(item.productUrl);
    if (existingId) {
      removeFavorite.mutate(existingId, { onSuccess: () => toast.info('Убрано из избранного') });
    } else {
      addFavorite.mutate(
        {
          marketplace: item.marketplace,
          title: item.title,
          price: item.price,
          oldPrice: item.oldPrice,
          rating: item.rating,
          reviewsCount: item.reviewsCount,
          imageUrl: item.imageUrl,
          productUrl: item.productUrl,
        },
        { onSuccess: () => toast.success('Добавлено в избранное') },
      );
    }
  };

  const exportCsv = () => {
    if (items.length === 0) return;
    const query = status.data?.query ?? 'результаты';
    downloadCsv(`${safeFileName(query)}_предложения`, resultsToCsv(sortedItems));
    toast.success('Файл CSV скачан');
  };

  const confirmTrack = (targetPrice: number | null) => {
    if (!trackItem) return;
    const item = trackItem;
    setTrackItem(null);
    addTracked.mutate(
      {
        marketplace: item.marketplace,
        title: item.title,
        productUrl: item.productUrl,
        currentPrice: item.price,
        targetPrice,
      },
      {
        onSuccess: () =>
          toast.success(
            targetPrice
              ? `Отслеживаем. Сообщим, когда цена станет ниже ${targetPrice.toLocaleString('ru-RU')} ₽`
              : 'Товар добавлен в отслеживаемые',
          ),
      },
    );
  };

  const header = (
    <div className="mb-4 flex items-center gap-3">
      <Link to="/" className="btn-ghost px-2.5" aria-label="Назад к поиску">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-bold">{status.data?.query ?? 'Результаты'}</h1>
        {ready && results.data && (
          <p className="text-sm text-slate-500">Найдено предложений: {allItems.length}</p>
        )}
      </div>
    </div>
  );

  if (status.isLoading) return <LoadingState text="Загружаем поиск…" />;
  if (status.isError) return <ErrorState text="Поиск не найден" />;
  if (status.data?.status === 'failed') {
    return (
      <>
        {header}
        <ErrorState text="Не удалось выполнить поиск. Попробуйте позже." />
      </>
    );
  }
  if (!ready) {
    return (
      <>
        {header}
        <p className="mb-4 text-center text-sm text-slate-500">
          Ищем и сравниваем предложения на маркетплейсах…
        </p>
        <SkeletonGrid />
      </>
    );
  }

  if (results.isLoading) return <SkeletonGrid />;
  if (allItems.length === 0) {
    return (
      <>
        {header}
        <EmptyState text="По вашему запросу ничего не нашлось. Попробуйте смягчить фильтры (рейтинг/отзывы) или изменить запрос." />
      </>
    );
  }

  // Сводка по источникам: сколько товаров с каждого выбранного маркетплейса.
  const selected = status.data?.marketplaces ?? [];
  const counts = new Map<string, number>();
  for (const it of allItems) counts.set(it.marketplace, (counts.get(it.marketplace) ?? 0) + 1);

  return (
    <>
      {header}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {selected.map((m) => {
          const n = counts.get(m) ?? 0;
          return (
            <span
              key={m}
              className={
                'rounded-full px-3 py-1 text-xs font-medium ' +
                (n > 0
                  ? marketplaceColor(m)
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')
              }
              title={n > 0 ? `${marketplaceLabel(m)}: ${n} шт.` : `${marketplaceLabel(m)}: нет данных`}
            >
              {marketplaceLabel(m)}: {n > 0 ? `${n} шт.` : 'нет данных'}
            </span>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Переключатель вида: обычный список vs сравнение цен по маркетплейсам. */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ' +
                (view === 'list'
                  ? 'bg-brand text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')
              }
            >
              <LayoutGrid className="h-4 w-4" /> Списком
            </button>
            <button
              onClick={() => setView('compare')}
              aria-pressed={view === 'compare'}
              className={
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ' +
                (view === 'compare'
                  ? 'bg-brand text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')
              }
            >
              <Scale className="h-4 w-4" /> Сравнить цены
            </button>
          </div>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand"
          >
            <Info className="h-4 w-4" /> Что такое балл выгодности?
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand"
            aria-label="Скачать результаты в CSV"
          >
            <Download className="h-4 w-4" /> Скачать CSV
          </button>
        </div>
        {view === 'list' && (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Сортировка
            <select
              className="input w-auto py-1.5"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {showLegend && (
        <div className="mb-4">
          <ScoreLegend />
        </div>
      )}

      {allItems.length > 6 && (
        <div className="relative mb-4">
          <input
            className="input pr-9"
            placeholder="Фильтр по названию (например: 256 ГБ, чёрный)…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="Фильтр результатов по названию"
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Очистить фильтр"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {filterText.trim() && (
            <p className="mt-1 text-xs text-slate-400">Показано {items.length} из {allItems.length}</p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState text="Под фильтр ничего не подошло. Измените или очистите фильтр." />
      ) : view === 'compare' ? (
        <PriceComparison
          items={items}
          renderActions={(item) => (
            <>
              <button
                onClick={() => toggleFavorite(item)}
                className="btn-ghost px-2"
                title={favByUrl.has(item.productUrl) ? 'Убрать из избранного' : 'В избранное'}
                aria-label={favByUrl.has(item.productUrl) ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <Heart
                  className={clsx(
                    'h-4 w-4',
                    favByUrl.has(item.productUrl) && 'fill-rose-500 text-rose-500',
                  )}
                />
              </button>
              <button
                onClick={() => setTrackItem(item)}
                className="btn-ghost px-2"
                title="Отслеживать цену"
                aria-label="Отслеживать цену товара"
              >
                <Bell className="h-4 w-4" />
              </button>
            </>
          )}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedItems.slice(0, visibleCount).map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isFavorite={favByUrl.has(item.productUrl)}
                bestPrice={item.price === minPrice}
                onToggleFavorite={toggleFavorite}
                onTrack={(it) => setTrackItem(it)}
              />
            ))}
          </div>
          {sortedItems.length > visibleCount && (
            <div className="mt-5 text-center">
              <button onClick={() => setVisibleCount((n) => n + 24)} className="btn-outline">
                Показать ещё ({sortedItems.length - visibleCount})
              </button>
            </div>
          )}
        </>
      )}

      <TrackDialog
        open={trackItem !== null}
        title={trackItem?.title ?? ''}
        currentPrice={trackItem?.price ?? 0}
        onConfirm={confirmTrack}
        onCancel={() => setTrackItem(null)}
      />
    </>
  );
}
