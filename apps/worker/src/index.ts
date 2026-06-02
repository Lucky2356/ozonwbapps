import './env'; // должен идти первым — загружает .env до чтения config
import { Worker } from 'bullmq';
import { config } from './config';
import { logger } from './logger';
import { processSearch } from './processor';
import { closeBrowser } from './adapters/browser';
import { checkAllTrackedPrices } from './pricecheck';
import { startTelegramBot, stopTelegramBot } from './telegrambot';

const QUEUE_NAME = 'search';

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { searchId } = job.data as { searchId: string };
    logger.info('Получена задача поиска', { searchId, jobId: job.id });
    await processSearch(searchId);
  },
  {
    connection: config.redis,
    concurrency: 2,
  },
);

worker.on('completed', (job) => logger.info('Задача выполнена', { jobId: job.id }));
worker.on('failed', (job, err) =>
  logger.error('Задача провалена', { jobId: job?.id, error: String(err) }),
);

logger.info('Воркер запущен и слушает очередь', {
  queue: QUEUE_NAME,
  marketplaces: config.enabledMarketplaces,
});

// --- Cron пересбора цен отслеживаемых товаров ---
let priceCheckTimer: ReturnType<typeof setInterval> | undefined;
function schedulePriceChecks() {
  const intervalMin = config.priceCheck.intervalMin;
  if (intervalMin <= 0) {
    logger.info('Трекинг цен: cron выключен (PRICE_CHECK_INTERVAL_MIN=0)');
    return;
  }
  const run = () =>
    checkAllTrackedPrices().catch((e) => logger.error('Трекинг цен: сбой прогона', { error: String(e) }));
  setTimeout(run, config.priceCheck.initialDelaySec * 1000);
  priceCheckTimer = setInterval(run, intervalMin * 60 * 1000);
  logger.info('Трекинг цен: cron запланирован', {
    intervalMin,
    initialDelaySec: config.priceCheck.initialDelaySec,
  });
}
schedulePriceChecks();

// --- Telegram-бот (привязка аккаунта + команды) ---
startTelegramBot();

async function shutdown() {
  logger.info('Остановка воркера...');
  if (priceCheckTimer) clearInterval(priceCheckTimer);
  stopTelegramBot();
  await worker.close();
  await closeBrowser();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
