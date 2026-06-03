import { Link } from 'react-router-dom';
import { Heart, Bell, Inbox } from 'lucide-react';
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
    { to: '/tracked', label: 'Отслеживается', value: trackedCount, icon: Bell, accent: false },
    { to: '/favorites', label: 'В избранном', value: favCount, icon: Heart, accent: false },
    {
      to: '/notifications',
      label: 'Новых уведомлений',
      value: unreadCount,
      icon: Inbox,
      accent: unreadCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <Link
          key={c.to}
          to={c.to}
          className={
            'card flex flex-col items-center gap-1 p-4 text-center transition hover:border-brand ' +
            (c.accent ? 'border-rose-300 dark:border-rose-700/60' : '')
          }
        >
          <c.icon
            className={'h-5 w-5 ' + (c.accent ? 'text-rose-500' : 'text-brand')}
          />
          <span className="text-2xl font-extrabold">{c.value}</span>
          <span className="text-xs text-slate-500">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}
