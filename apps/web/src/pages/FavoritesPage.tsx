import { useState } from 'react';
import { ExternalLink, Trash2, Star, Download } from 'lucide-react';
import { useFavorites, useRemoveFavorite } from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatPrice, marketplaceLabel } from '../lib/format';
import { downloadCsv, favoritesToCsv } from '../lib/export';
import { toast } from '../store/toast';

export function FavoritesPage() {
  const { data, isLoading, isError } = useFavorites();
  const remove = useRemoveFavorite();
  const [pendingId, setPendingId] = useState<string | null>(null);

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Избранное</h1>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand"
          aria-label="Скачать избранное в CSV"
        >
          <Download className="h-4 w-4" /> Скачать CSV
        </button>
      </div>
      {data.map((f) => (
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
      ))}

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
