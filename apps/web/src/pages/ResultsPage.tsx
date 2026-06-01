import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  useSearchStatus,
  useSearchResults,
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
  useAddTracked,
} from '../api/hooks';
import { ProductCard } from '../components/ProductCard';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { marketplaceColor, marketplaceLabel } from '../lib/format';
import type { ResultItem } from '../api/types';

export function ResultsPage() {
  const { searchId } = useParams<{ searchId: string }>();
  const status = useSearchStatus(searchId);
  const ready = status.data?.status === 'completed';
  const results = useSearchResults(searchId, ready);

  const favorites = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const addTracked = useAddTracked();

  const favByUrl = new Map((favorites.data ?? []).map((f) => [f.productUrl, f.id]));

  const toggleFavorite = (item: ResultItem) => {
    const existingId = favByUrl.get(item.productUrl);
    if (existingId) {
      removeFavorite.mutate(existingId);
    } else {
      addFavorite.mutate({
        marketplace: item.marketplace,
        title: item.title,
        price: item.price,
        oldPrice: item.oldPrice,
        rating: item.rating,
        reviewsCount: item.reviewsCount,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
      });
    }
  };

  const track = (item: ResultItem) => {
    addTracked.mutate(
      {
        marketplace: item.marketplace,
        title: item.title,
        productUrl: item.productUrl,
        currentPrice: item.price,
      },
      {
        onSuccess: () => alert('Товар добавлен в отслеживаемые'),
      },
    );
  };

  const header = (
    <div className="mb-4 flex items-center gap-3">
      <Link to="/" className="btn-ghost px-2.5">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-bold">{status.data?.query ?? 'Результаты'}</h1>
        {ready && results.data && (
          <p className="text-sm text-slate-500">Найдено предложений: {results.data.results.length}</p>
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
        <LoadingState text="Ищем и сравниваем предложения на маркетплейсах…" />
      </>
    );
  }

  if (results.isLoading) return <LoadingState text="Готовим результаты…" />;
  const items = results.data?.results ?? [];
  if (items.length === 0) {
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
  for (const it of items) counts.set(it.marketplace, (counts.get(it.marketplace) ?? 0) + 1);

  return (
    <>
      {header}
      <div className="mb-4 flex flex-wrap gap-2">
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            isFavorite={favByUrl.has(item.productUrl)}
            onToggleFavorite={toggleFavorite}
            onTrack={track}
          />
        ))}
      </div>
    </>
  );
}
