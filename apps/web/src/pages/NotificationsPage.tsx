import { useState } from 'react';
import {
  ExternalLink,
  BellOff,
  CheckCheck,
  TrendingDown,
  Target,
  Trash2,
  X,
  ArrowLeftRight,
  Award,
} from 'lucide-react';
import clsx from 'clsx';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearNotifications,
} from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { ConfirmDialog } from '../components/ConfirmDialog';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Иконка и цвет под тип уведомления. */
function visual(type: string): { Icon: typeof Target; color: string } {
  switch (type) {
    case 'target_reached':
      return { Icon: Target, color: 'text-emerald-500' };
    case 'cheaper_found':
      return { Icon: ArrowLeftRight, color: 'text-violet-500' };
    case 'historical_low':
      return { Icon: Award, color: 'text-amber-500' };
    default:
      return { Icon: TrendingDown, color: 'text-blue-500' };
  }
}

export function NotificationsPage() {
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const clearAll = useClearNotifications();
  const [confirmClear, setConfirmClear] = useState(false);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data || data.length === 0)
    return (
      <EmptyState text="Уведомлений пока нет. Они появятся при снижении цены, достижении цели, новом историческом минимуме или когда товар найдётся дешевле на другом маркетплейсе." />
    );

  const hasUnread = data.some((n) => !n.read);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Уведомления</h1>
        <div className="flex gap-2">
          {hasUnread && (
            <button onClick={() => markAll.mutate()} className="btn-ghost text-sm">
              <CheckCheck className="h-4 w-4" /> Прочитать все
            </button>
          )}
          <button onClick={() => setConfirmClear(true)} className="btn-ghost text-sm text-rose-500">
            <Trash2 className="h-4 w-4" /> Очистить
          </button>
        </div>
      </div>

      {data.map((n) => {
        const { Icon, color } = visual(n.type);
        return (
          <div
            key={n.id}
            className={clsx(
              'card flex items-start gap-3 p-4',
              !n.read && 'border-l-4 border-l-brand',
            )}
          >
            <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', color)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{n.title}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-400">{formatWhen(n.createdAt)}</span>
                  <button
                    onClick={() => remove.mutate(n.id)}
                    className="text-slate-300 hover:text-rose-500"
                    title="Удалить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500">{n.message}</p>
              <div className="mt-2 flex items-center gap-3">
                {n.productUrl && (
                  <a
                    href={n.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Открыть товар
                  </a>
                )}
                {!n.read && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <BellOff className="h-3.5 w-3.5" /> Отметить прочитанным
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <ConfirmDialog
        open={confirmClear}
        title="Очистить уведомления?"
        message="Все уведомления будут удалены без возможности восстановления."
        confirmLabel="Очистить"
        onConfirm={() => {
          clearAll.mutate();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
