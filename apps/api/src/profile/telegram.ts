/**
 * Небольшой помощник для Telegram на стороне API: узнать username бота (для deep-link
 * вида https://t.me/<bot>?start=<code>). Username берём из TELEGRAM_BOT_USERNAME, а если
 * не задан — запрашиваем у Telegram через getMe и кешируем на время жизни процесса.
 */
let cachedUsername: string | null = null;

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function getBotUsername(): Promise<string | null> {
  if (cachedUsername) return cachedUsername;
  const envName = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (envName) {
    cachedUsername = envName.replace(/^@/, '');
    return cachedUsername;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
    cachedUsername = data?.result?.username ?? null;
    return cachedUsername;
  } catch {
    return null;
  }
}
