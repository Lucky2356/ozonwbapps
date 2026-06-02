import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Check, ExternalLink, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';
import {
  useProfile,
  useUpdateProfile,
  useCreateTelegramLink,
} from '../api/hooks';
import { toast } from '../store/toast';
import type { TelegramLink } from '../api/types';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const createLink = useCreateTelegramLink();

  const [link, setLink] = useState<TelegramLink | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [chatId, setChatId] = useState('');
  const [saved, setSaved] = useState(false);

  const connected = Boolean(profile?.telegramChatId);
  const serverHasBot = profile?.telegramConfigured ?? false;

  const connect = async () => {
    const result = await createLink.mutateAsync();
    setLink(result);
    if (result.deepLink) window.open(result.deepLink, '_blank', 'noopener');
  };

  const disconnect = async () => {
    await updateProfile.mutateAsync({ telegramChatId: '' });
    setLink(null);
    toast.info('Telegram отключён');
  };

  const saveManual = async () => {
    await updateProfile.mutateAsync({ telegramChatId: chatId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success(chatId.trim() ? 'Chat ID сохранён' : 'Telegram-уведомления отключены');
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

        {connected ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Telegram подключён — уведомления о снижении цен
              приходят в чат.
            </p>
            <button onClick={disconnect} disabled={updateProfile.isPending} className="btn-ghost text-rose-500">
              Отключить Telegram
            </button>
          </div>
        ) : serverHasBot ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Подключите бота, чтобы получать сообщения о снижении цены отслеживаемых товаров. Нажмите
              кнопку — откроется чат с ботом, в нём нажмите «Запустить» (Start).
            </p>
            <button onClick={connect} disabled={createLink.isPending} className="btn-primary">
              <Send className="h-4 w-4" /> Подключить Telegram
            </button>

            {link && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                {link.deepLink ? (
                  <p>
                    Если чат не открылся автоматически —{' '}
                    <a
                      href={link.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-brand"
                    >
                      откройте бота <ExternalLink className="h-3.5 w-3.5" />
                    </a>{' '}
                    и нажмите «Запустить».
                  </p>
                ) : (
                  <p>
                    Откройте вашего бота в Telegram и отправьте команду:{' '}
                    <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">/start {link.code}</code>
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  После подтверждения в боте статус здесь обновится автоматически (или обновите
                  страницу).
                </p>
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['profile'] })}
                  className="mt-2 text-xs font-medium text-brand"
                >
                  Проверить статус
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Telegram-бот не настроен на сервере. Задайте <code>TELEGRAM_BOT_TOKEN</code> в окружении,
            чтобы включить уведомления в Telegram. Уведомления в приложении работают всегда.
          </p>
        )}

        {/* Ручной ввод Chat ID — запасной вариант. */}
        <button
          onClick={() => setShowManual((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <ChevronDown className={'h-3.5 w-3.5 transition ' + (showManual ? 'rotate-180' : '')} />
          Ввести Chat ID вручную
        </button>
        {showManual && (
          <div className="mt-2">
            <div className="flex gap-2">
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Telegram Chat ID (например, 123456789)"
                className="input flex-1"
                inputMode="numeric"
              />
              <button onClick={saveManual} disabled={updateProfile.isPending} className="btn-primary">
                {saved ? <Check className="h-4 w-4" /> : 'Сохранить'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Узнать Chat ID можно через бота <span className="font-mono">@userinfobot</span>. Пустое
              значение отключает Telegram-уведомления.
            </p>
          </div>
        )}
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
