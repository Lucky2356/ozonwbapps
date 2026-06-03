import { prisma } from '@ozonwb/db';
import { config } from './config';
import { logger } from './logger';
import { sendTelegram, telegramFetch, describeFetchError } from './notify';

/**
 * Telegram-бот на long polling (getUpdates). Нужен, чтобы:
 *  - привязывать аккаунт: пользователь жмёт в настройках «Подключить Telegram», получает
 *    deep-link `t.me/<bot>?start=<код>`; бот ловит /start <код> и сохраняет chatId в аккаунт;
 *  - обрабатывать команды /stop (отключить уведомления) и /help.
 *
 * Webhook не используем — long polling проще для self-hosted без публичного URL.
 */
let offset = 0;
let running = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TgUpdate {
  update_id: number;
  message?: { text?: string; chat?: { id?: number } };
}

export function startTelegramBot(): void {
  if (!config.telegram.botToken) {
    logger.info('Telegram-бот: токен не задан (TELEGRAM_BOT_TOKEN) — бот выключен');
    return;
  }
  running = true;
  logger.info('Telegram-бот: запущен (long polling)');
  void pollLoop();
}

export function stopTelegramBot(): void {
  running = false;
}

async function pollLoop(): Promise<void> {
  let failures = 0;
  while (running) {
    try {
      const updates = await getUpdates();
      if (failures > 0) {
        logger.info('Telegram-бот: связь восстановлена');
        failures = 0;
      }
      for (const u of updates) {
        offset = Math.max(offset, u.update_id + 1);
        await handleUpdate(u);
      }
    } catch (e) {
      failures++;
      // Бэк-офф: 3с, 6с, ... до 60с. Логируем причину не на каждой попытке, чтобы не спамить.
      const backoff = Math.min(3000 * 2 ** Math.min(failures - 1, 5), 60000);
      if (failures === 1 || failures % 10 === 0) {
        logger.warn('Telegram-бот: ошибка опроса', {
          error: describeFetchError(e),
          failures,
          подсказка: config.telegram.proxyUrl
            ? 'проверьте доступность прокси'
            : 'api.telegram.org недоступен — задайте TELEGRAM_PROXY',
        });
      }
      await sleep(backoff);
    }
  }
}

async function getUpdates(): Promise<TgUpdate[]> {
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/getUpdates?timeout=30&offset=${offset}`;
  const res = await telegramFetch(url);
  if (!res.ok) throw new Error(`getUpdates ${res.status}`);
  const data = (await res.json()) as { result?: TgUpdate[] };
  return data.result ?? [];
}

async function handleUpdate(u: TgUpdate): Promise<void> {
  const text = u.message?.text?.trim();
  const chatIdNum = u.message?.chat?.id;
  if (!text || chatIdNum == null) return;
  const chatId = String(chatIdNum);

  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1];
    if (code) {
      await linkAccount(chatId, code);
    } else {
      await sendTelegram(
        chatId,
        'Привет! Это бот «Выгода». Чтобы получать уведомления о снижении цен, откройте в приложении ' +
          '<b>Настройки → Подключить Telegram</b> и перейдите по ссылке оттуда.',
      );
    }
    return;
  }

  if (text === '/stop') {
    const r = await prisma.user.updateMany({
      where: { telegramChatId: chatId },
      data: { telegramChatId: null },
    });
    await sendTelegram(
      chatId,
      r.count > 0
        ? 'Уведомления отключены. Снова подключить можно в настройках приложения.'
        : 'Этот чат не привязан к аккаунту.',
    );
    return;
  }

  if (text === '/help') {
    await sendTelegram(
      chatId,
      'Команды:\n/start &lt;код&gt; — подключить аккаунт\n/stop — отключить уведомления',
    );
    return;
  }

  await sendTelegram(chatId, 'Не понял команду. /help — список команд.');
}

async function linkAccount(chatId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { telegramLinkCode: code } });
  if (!user) {
    await sendTelegram(
      chatId,
      'Код привязки не найден или уже использован. Сгенерируйте новый в настройках приложения.',
    );
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: chatId, telegramLinkCode: null },
  });
  await sendTelegram(chatId, '✅ Готово! Telegram подключён — будете получать уведомления о снижении цен.');
  logger.info('Telegram-бот: аккаунт привязан', { userId: user.id });
}
