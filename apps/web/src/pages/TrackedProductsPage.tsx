import { useState } from 'react';
import { ExternalLink, Trash2, RefreshCw, Target } from 'lucide-react';
import clsx from 'clsx';
import {
  useTracked,
  useRemoveTracked,
  useCheckTracked,
  useUpdateTracked,
} from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TrackDialog } from '../components/TrackDialog';
import { formatPrice, marketplaceLabel } from '../lib/format';
import { toast } from '../store/toast';
import type { TrackedProduct } from '../api/types';

export function TrackedProductsPage() {
  const { data, isLoading, isError } = useTracked();
  const remove = useRemoveTracked();
  const check = useCheckTracked();
  const updateTarget = useUpdateTracked();

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TrackedProduct | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        text="Нет отслеживаемых товаров. Нажмите на колокольчик у товара в результатах поиска, чтобы отслеживать цену."
        action={{ to: '/', label: 'Перейти к поиску' }}
      />
    );

  const runCheck = (id: string) => {
    check.mutate(id, { onSuccess: () => toast.info('Проверяем цену — это займёт несколько секунд') });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete, { onSuccess: () => toast.info('Товар снят с отслеживания') });
    setPendingDelete(null);
  };

  const saveTarget = (targetPrice: number | null) => {
    if (!editTarget) return;
    updateTarget.mutate(
      { id: editTarget.id, targetPrice },
      {
        onSuccess: () =>
          toast.success(
            targetPrice
              ? `Цель обновлена: ниже ${targetPrice.toLocaleString('ru-RU')} ₽`
              : 'Цель убрана — сообщим о любом снижении',
          ),
      },
    );
    setEditTarget(null);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Отслеживание цен</h1>
      <p className="text-sm text-slate-500">
        Цены проверяются автоматически по расписанию. Кнопка{' '}
        <RefreshCw className="inline h-3.5 w-3.5" /> запускает проверку сейчас, кнопка{' '}
        <Target className="inline h-3.5 w-3.5" /> задаёт желаемую цену для уведомления.
      </p>
      {data.map((t) => (
        <div key={t.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-1 font-medium">{t.title}</p>
              <p className="text-sm text-slate-500">
                {marketplaceLabel(t.marketplace)}
                {t.lastPrice != null && <> · текущая {formatPrice(t.lastPrice)}</>}
                {t.targetPrice != null ? (
                  <> · цель {formatPrice(t.targetPrice)}</>
                ) : (
                  <> · цель не задана</>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => runCheck(t.id)}
                disabled={check.isPending && check.variables === t.id}
                className="btn-ghost px-2.5"
                title="Проверить цену сейчас"
                aria-label="Проверить цену сейчас"
              >
                <RefreshCw
                  className={clsx(
                    'h-4 w-4',
                    check.isPending && check.variables === t.id && 'animate-spin',
                  )}
                />
              </button>
              <button
                onClick={() => setEditTarget(t)}
                className="btn-ghost px-2.5"
                title="Задать целевую цену"
                aria-label="Задать целевую цену"
              >
                <Target className="h-4 w-4" />
              </button>
              <a
                href={t.productUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-2.5"
                aria-label="Открыть товар"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => setPendingDelete(t.id)}
                className="btn-ghost px-2.5 text-rose-500"
                aria-label="Снять с отслеживания"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <PriceHistoryChart points={t.priceHistory} />
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Снять с отслеживания?"
        message="Товар и его история цен будут удалены из отслеживаемых."
        confirmLabel="Снять"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <TrackDialog
        open={editTarget !== null}
        title={editTarget?.title ?? ''}
        currentPrice={editTarget?.lastPrice ?? 0}
        initialTarget={editTarget?.targetPrice ?? null}
        onConfirm={saveTarget}
        onCancel={() => setEditTarget(null)}
      />
    </div>
  );
}
