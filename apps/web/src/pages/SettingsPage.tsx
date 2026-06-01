import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Настройки</h1>

      <div className="card p-5">
        <h2 className="mb-1 font-semibold">Аккаунт</h2>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      <div className="card flex items-center justify-between p-5">
        <div>
          <h2 className="font-semibold">Тема оформления</h2>
          <p className="text-sm text-slate-500">Сейчас: {theme === 'dark' ? 'тёмная' : 'светлая'}</p>
        </div>
        <button onClick={toggle} className="btn-ghost">
          Переключить
        </button>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold">О выгодности</h2>
        <p className="text-sm text-slate-500">
          Балл выгодности учитывает цену относительно средней, рейтинг, количество отзывов, скидку и
          репутацию продавца. Подозрительно низкие цены и отсутствие отзывов снижают балл.
        </p>
      </div>

      <button onClick={logout} className="btn-ghost w-full text-rose-500">
        Выйти из аккаунта
      </button>
    </div>
  );
}
