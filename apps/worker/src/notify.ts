import { config } from './config';
import { logger } from './logger';

/**
 * Отправка сообщения в Telegram через Bot API.
 * Если токен бота не задан или chatId пуст — тихо пропускаем (уведомление остаётся в приложении).
 */
export async function sendTelegram(chatId: string | null | undefined, text: string): Promise<boolean> {
  if (!config.telegram.botToken || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
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
    logger.warn('Telegram: ошибка отправки', { error: String(e) });
    return false;
  }
}
