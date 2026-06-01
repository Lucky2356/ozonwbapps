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
  wb: {
    dest: process.env.WB_DEST ?? '-1257786',
    searchVersion: process.env.WB_SEARCH_VERSION ?? 'v13',
  },
  ozon: {
    enabled: (process.env.OZON_ENABLED ?? 'true') === 'true',
    timeoutMs: Number(process.env.OZON_TIMEOUT_MS ?? 30000),
  },
  scoreWeights: {
    SCORE_WEIGHT_PRICE: process.env.SCORE_WEIGHT_PRICE,
    SCORE_WEIGHT_RATING: process.env.SCORE_WEIGHT_RATING,
    SCORE_WEIGHT_REVIEWS: process.env.SCORE_WEIGHT_REVIEWS,
    SCORE_WEIGHT_DISCOUNT: process.env.SCORE_WEIGHT_DISCOUNT,
    SCORE_WEIGHT_SELLER: process.env.SCORE_WEIGHT_SELLER,
  },
};
