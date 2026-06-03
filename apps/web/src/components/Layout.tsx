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

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-soft">
        <Sparkles className="h-5 w-5" />
      </span>
      Выгода
    </Link>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (n: (typeof NAV)[number], orientation: 'side' | 'top') => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-2.5 rounded-xl text-sm font-medium transition',
          orientation === 'side' ? 'px-3 py-2.5' : 'shrink-0 whitespace-nowrap px-3 py-2',
          isActive
            ? 'bg-brand/10 text-brand dark:bg-brand/15'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        )
      }
    >
      <span className="relative">
        <n.icon className="h-[18px] w-[18px]" />
        {n.badge && unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </span>
      {n.label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl">
        {/* Боковое меню (десктоп) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/70 px-4 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40 lg:flex">
          <Brand />
          <nav className="mt-7 flex flex-1 flex-col gap-1">{NAV.map((n) => navLink(n, 'side'))}</nav>
          <div className="mt-auto space-y-1 border-t border-slate-200/80 pt-3 dark:border-slate-800">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800',
                )
              }
            >
              <Settings className="h-[18px] w-[18px]" /> Настройки
            </NavLink>
            <div className="flex items-center gap-2 px-3 pt-2">
              <ThemeToggle />
              <span className="truncate text-xs text-slate-400" title={user?.email}>
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                title="Выйти"
                aria-label="Выйти из аккаунта"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Основная колонка */}
        <div className="flex min-h-screen w-full flex-col">
          {/* Шапка (мобайл) */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 lg:hidden">
            <Brand />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NavLink
                to="/settings"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Настройки"
              >
                <Settings className="h-[18px] w-[18px]" />
              </NavLink>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                aria-label="Выйти из аккаунта"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </header>

          {/* Навигация (мобайл) */}
          <nav className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-3 py-2 dark:border-slate-800 lg:hidden">
            {NAV.map((n) => navLink(n, 'top'))}
          </nav>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>

          <footer className="px-6 py-5 text-center text-xs text-slate-400">
            Данные собираются из публичных источников. Цены и наличие могут отличаться от актуальных.
          </footer>
        </div>
      </div>
    </div>
  );
}
