import { ExternalLink, Trash2, Star } from 'lucide-react';
import { useFavorites, useRemoveFavorite } from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { formatPrice, marketplaceLabel } from '../lib/format';

export function FavoritesPage() {
  const { data, isLoading, isError } = useFavorites();
  const remove = useRemoveFavorite();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data || data.length === 0)
    return <EmptyState text="В избранном пока пусто. Добавляйте товары из результатов поиска." />;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Избранное</h1>
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
          <a href={f.productUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2.5">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={() => remove.mutate(f.id)} className="btn-ghost px-2.5 text-rose-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
