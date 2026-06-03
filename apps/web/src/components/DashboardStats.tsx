import { Link } from 'react-router-dom';
import { Heart, Bell, Inbox, ChevronRight } from 'lucide-react';
import { useFavorites, useTracked, useUnreadCount } from '../api/hooks';

/**
 * Краткая сводка на главной: сколько товаров отслеживается, в избранном и сколько
 * непрочитанных уведомлений. Показывается только когда пользователю есть что показать.
 */
export function DashboardStats() {
  const favorites = useFavorites();
  const tracked = useTracked();
  const unread = useUnreadCount();

  const favCount = favorites.data?.length ?? 0;
  const trackedCount = tracked.data?.length ?? 0;
  const unreadCount = unread.data?.count ?? 0;

  if (favCount === 0 && trackedCount === 0 && unreadCount === 0) return null;

  const cards = [
    {
      to: '/tracked',
      label: 'Отслеживается',
      value: trackedCount,
      icon: Bell,
      tint: 'bg-brand/10 text-brand',
    },
    {
      to: '/favorites',
      label: 'В избранном',
      value: favCount,
      icon: Heart,
      tint: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    },
    {
      to: '/notifications',
      label: 'Новых уведомлений',
      value: unreadCount,
      icon: Inbox,
      tint: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.to}
          to={c.to}
          className="card card-hover group flex items-center gap-4 p-4"
        >
          <span className={'flex h-11 w-11 items-center justify-center rounded-xl ' + c.tint}>
            <c.icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-2xl font-extrabold leading-none tracking-tight">
              {c.value}
            </span>
            <span className="mt-1 block text-xs text-slate-500">{c.label}</span>
          </span>
          <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
        </Link>
      ))}
    </div>
  );
}
