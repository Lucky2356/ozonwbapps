import { useMemo, useState } from 'react';
import { ExternalLink, Trash2, Star, Download, LayoutGrid, Scale } from 'lucide-react';
import { useFavorites, useRemoveFavorite } from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PriceComparison, type ComparisonItem } from '../components/PriceComparison';
import { formatPrice, marketplaceLabel } from '../lib/format';
import { downloadCsv, favoritesToCsv } from '../lib/export';
import { toast } from '../store/toast';

export function FavoritesPage() {
  const { data, isLoading, isError } = useFavorites();
  const remove = useRemoveFavorite();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'compare'>('list');

  // Маппинг избранного в элементы сравнения (reviewsCount: null → undefined).
  const comparisonItems = useMemo<ComparisonItem[]>(
    () =>
      (data ?? []).map((f) => ({
        id: f.id,
        title: f.title,
        price: f.price,
        marketplace: f.marketplace,
        productUrl: f.productUrl,
        imageUrl: f.imageUrl,
        rating: f.rating,
        reviewsCount: f.reviewsCount ?? undefined,
      })),
    [data],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data || data.length === 0)
    return (
      <EmptyState text="В избранном пока пусто. Добавляйте товары из результатов поиска." action={{ to: '/', label: 'Перейти к поиску' }} />
    );

  const confirmRemove = () => {
    if (!pendingId) return;
    remove.mutate(pendingId, { onSuccess: () => toast.info('Убрано из избранного') });
    setPendingId(null);
  };

  const exportCsv = () => {
    downloadCsv('избранное', favoritesToCsv(data));
    toast.success('Файл CSV скачан');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Избранное</h1>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ' +
                (view === 'list' ? 'bg-brand text-white' : 'text-slate-500')
              }
            >
              <LayoutGrid className="h-4 w-4" /> Списком
            </button>
            <button
              onClick={() => setView('compare')}
              aria-pressed={view === 'compare'}
              className={
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ' +
                (view === 'compare' ? 'bg-brand text-white' : 'text-slate-500')
              }
            >
              <Scale className="h-4 w-4" /> Сравнить
            </button>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand"
            aria-label="Скачать избранное в CSV"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {view === 'compare' ? (
        <PriceComparison
          items={comparisonItems}
          emptyHint="Среди избранного нет одинаковых товаров с разных маркетплейсов для сравнения."
          renderActions={(item) => (
            <button
              onClick={() => setPendingId(item.id)}
              className="btn-ghost px-2 text-rose-500"
              title="Убрать из избранного"
              aria-label="Убрать из избранного"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        />
      ) : (
        data.map((f) => (
          <div key={f.id} className="card flex items-center gap-3 p-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              {f.imageUrl && <img src={f.imageUrl} alt={f.title} className="h-full w-full object-contain" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 font-medium">{f.title}</p>
              <p className="text-sm text-slate-500">
                {marketplaceLabel(f.marketplace)} · {formatPrice(f.price)}
                {f.rating != null && (
                  <span className="ml-2 inline-flex items-center gap-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {f.rating.toFixed(1)}
                  </span>
                )}
              </p>
            </div>
            <a
              href={f.productUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-2.5"
              aria-label="Открыть товар"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={() => setPendingId(f.id)}
              className="btn-ghost px-2.5 text-rose-500"
              aria-label="Убрать из избранного"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}

      <ConfirmDialog
        open={pendingId !== null}
        title="Убрать из избранного?"
        message="Товар будет удалён из списка избранного."
        confirmLabel="Убрать"
        onConfirm={confirmRemove}
        onCancel={() => setPendingId(null)}
      />
    </div>
  );
}
