import { useEffect, useState } from 'react';
import { Send, Check } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';
import { useProfile, useUpdateProfile } from '../api/hooks';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [chatId, setChatId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.telegramChatId != null) setChatId(profile.telegramChatId);
  }, [profile?.telegramChatId]);

  const save = async () => {
    await updateProfile.mutateAsync({ telegramChatId: chatId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <Send className="h-4 w-4 text-sky-500" /> Уведомления в Telegram
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          Получайте сообщения о снижении цены отслеживаемых товаров прямо в Telegram. Откройте бота,
          отправьте ему любое сообщение, затем узнайте свой Chat ID (например, через бота{' '}
          <span className="font-mono">@userinfobot</span>) и вставьте его сюда.
        </p>
        <div className="flex gap-2">
          <input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Ваш Telegram Chat ID (например, 123456789)"
            className="input flex-1"
            inputMode="numeric"
          />
          <button onClick={save} disabled={updateProfile.isPending} className="btn-primary">
            {saved ? <Check className="h-4 w-4" /> : 'Сохранить'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Оставьте поле пустым и сохраните, чтобы отключить Telegram-уведомления. Уведомления в
          приложении остаются в любом случае.
        </p>
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
