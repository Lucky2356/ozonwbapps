/** Конфигурация воркера из переменных окружения. */
export const config = {
  redis: (() => {
    if (process.env.REDIS_URL) {
      const url = new URL(process.env.REDIS_URL);
      return { host: url.hostname, port: Number(url.port || 6379) };
    }
    return {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    };
  })(),
  enabledMarketplaces: (process.env.ENABLED_MARKETPLACES ?? 'ozon,wildberries')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  cacheTtlSeconds: Number(process.env.PARSER_CACHE_TTL ?? 900),
  maxItems: Number(process.env.PARSER_MAX_ITEMS ?? 60),
  requestDelayMs: Number(process.env.PARSER_REQUEST_DELAY_MS ?? 800),
  priceCheck: {
    // Интервал пересбора цен отслеживаемых товаров, минуты (0 = выключить cron).
    intervalMin: Number(process.env.PRICE_CHECK_INTERVAL_MIN ?? 360),
    // Задержка перед первым прогоном после старта воркера, секунды.
    initialDelaySec: Number(process.env.PRICE_CHECK_INITIAL_DELAY_SEC ?? 60),
  },
  telegram: {
    // Токен бота от @BotFather; пусто = Telegram-уведомления выключены.
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  },
  wb: {
    dest: process.env.WB_DEST ?? '-1257786',
    searchVersion: process.env.WB_SEARCH_VERSION ?? 'v13',
    // WB отдаёт товары только обычному браузеру; headless он детектит. По умолчанию headed.
    // На сервере без дисплея используйте xvfb-run, либо WB_HEADLESS=1 (WB тогда вернёт пусто).
    headless: process.env.WB_HEADLESS === '1',
  },
  ozon: {
    enabled: (process.env.OZON_ENABLED ?? 'true') === 'true',
    timeoutMs: Number(process.env.OZON_TIMEOUT_MS ?? 30000),
  },
  yandex: {
    // У Яндекс.Маркета сильная капча; в headless она срабатывает чаще. По умолчанию headless,
    // на «чистом» RU-IP можно перевести в headed (YM_HEADLESS=0) для большей надёжности.
    headless: process.env.YM_HEADLESS !== '0',
    timeoutMs: Number(process.env.YM_TIMEOUT_MS ?? 30000),
  },
  scoreWeights: {
    SCORE_WEIGHT_PRICE: process.env.SCORE_WEIGHT_PRICE,
    SCORE_WEIGHT_RATING: process.env.SCORE_WEIGHT_RATING,
    SCORE_WEIGHT_REVIEWS: process.env.SCORE_WEIGHT_REVIEWS,
    SCORE_WEIGHT_DISCOUNT: process.env.SCORE_WEIGHT_DISCOUNT,
    SCORE_WEIGHT_SELLER: process.env.SCORE_WEIGHT_SELLER,
  },
};
