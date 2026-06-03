import { ProxyAgent, type Dispatcher } from 'undici';
import { config } from './config';
import { logger } from './logger';

/**
 * Фетч к Telegram Bot API. В РФ api.telegram.org часто недоступен напрямую — поэтому при
 * заданном TELEGRAM_PROXY (или HTTPS_PROXY/ALL_PROXY) запросы идут через прокси (undici ProxyAgent).
 */
let dispatcher: Dispatcher | undefined;
let dispatcherInit = false;

function getDispatcher(): Dispatcher | undefined {
  if (dispatcherInit) return dispatcher;
  dispatcherInit = true;
  if (config.telegram.proxyUrl) {
    try {
      dispatcher = new ProxyAgent(config.telegram.proxyUrl);
      logger.info('Telegram: используется прокси', { proxy: config.telegram.proxyUrl });
    } catch (e) {
      logger.warn('Telegram: не удалось настроить прокси', { error: String(e) });
    }
  }
  return dispatcher;
}

/** Разворачивает причину ошибки fetch (undici прячет её в error.cause). */
export function describeFetchError(e: unknown): string {
  const err = e as { message?: string; cause?: { code?: string; message?: string } };
  const cause = err?.cause;
  if (cause?.code || cause?.message) return `${err?.message ?? 'fetch failed'} (${cause.code ?? ''} ${cause.message ?? ''})`.trim();
  return String(err?.message ?? e);
}

/** fetch к Telegram с учётом прокси. */
export function telegramFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const d = getDispatcher();
  // dispatcher — нестандартная опция undici-fetch (Node поддерживает её в RequestInit).
  return fetch(url, d ? ({ ...init, dispatcher: d } as RequestInit) : init);
}

/**
 * Отправка сообщения в Telegram через Bot API.
 * Если токен бота не задан или chatId пуст — тихо пропускаем (уведомление остаётся в приложении).
 */
export async function sendTelegram(chatId: string | null | undefined, text: string): Promise<boolean> {
  if (!config.telegram.botToken || !chatId) return false;
  try {
    const res = await telegramFetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      logger.warn('Telegram: ответ не ok', { status: res.status });
      return false;
    }
    return true;
  } catch (e) {
    logger.warn('Telegram: ошибка отправки', { error: describeFetchError(e) });
    return false;
  }
}
