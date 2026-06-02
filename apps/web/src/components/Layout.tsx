import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, Heart, Bell, History, LogOut, Sparkles, Inbox, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../store/auth';
import { useUnreadCount } from '../api/hooks';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/', label: 'Поиск', icon: Search, end: true },
  { to: '/favorites', label: 'Избранное', icon: Heart },
  { to: '/tracked', label: 'Отслеживание', icon: Bell },
  { to: '/notifications', label: 'Уведомления', icon: Inbox, badge: true },
  { to: '/history', label: 'История', icon: History },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="flex items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
          <Sparkles className="h-6 w-6 text-brand" />
          Выгода
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
          <NavLink to="/settings" className="btn-ghost px-2.5" title="Настройки" aria-label="Настройки">
            <Settings className="h-4 w-4" />
          </NavLink>
          <button
            onClick={handleLogout}
            className="btn-ghost px-2.5"
            title="Выйти"
            aria-label="Выйти из аккаунта"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-white text-brand shadow-sm dark:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              )
            }
          >
            <span className="relative">
              <n.icon className="h-4 w-4" />
              {n.badge && unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 pb-10">
        <Outlet />
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        Данные собираются из публичных источников. Цены и наличие могут отличаться от актуальных.
      </footer>
    </div>
  );
}
