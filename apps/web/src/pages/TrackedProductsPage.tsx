import { ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useTracked, useRemoveTracked, useCheckTracked } from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { formatPrice, marketplaceLabel } from '../lib/format';

export function TrackedProductsPage() {
  const { data, isLoading, isError } = useTracked();
  const remove = useRemoveTracked();
  const check = useCheckTracked();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data || data.length === 0)
    return (
      <EmptyState text="Нет отслеживаемых товаров. Нажмите на колокольчик у товара, чтобы отслеживать цену." />
    );

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Отслеживание цен</h1>
      <p className="text-sm text-slate-500">
        Цены проверяются автоматически по расписанию. Кнопка{' '}
        <RefreshCw className="inline h-3.5 w-3.5" /> запускает проверку сейчас — новая цена появится
        через несколько секунд.
      </p>
      {data.map((t) => (
        <div key={t.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium">{t.title}</p>
              <p className="text-sm text-slate-500">
                {marketplaceLabel(t.marketplace)}
                {t.lastPrice != null && <> · текущая {formatPrice(t.lastPrice)}</>}
                {t.targetPrice != null && <> · цель {formatPrice(t.targetPrice)}</>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => check.mutate(t.id)}
                disabled={check.isPending && check.variables === t.id}
                className="btn-ghost px-2.5"
                title="Проверить цену сейчас"
              >
                <RefreshCw
                  className={clsx(
                    'h-4 w-4',
                    check.isPending && check.variables === t.id && 'animate-spin',
                  )}
                />
              </button>
              <a href={t.productUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2.5">
                <ExternalLink className="h-4 w-4" />
              </a>
              <button onClick={() => remove.mutate(t.id)} className="btn-ghost px-2.5 text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <PriceHistoryChart points={t.priceHistory} />
          </div>
        </div>
      ))}
    </div>
  );
}
