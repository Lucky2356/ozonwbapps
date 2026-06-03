import './env'; // должен идти первым — загружает .env до чтения config
import { Worker } from 'bullmq';
import { config } from './config';
import { logger } from './logger';
import { processSearch } from './processor';
import { closeBrowser } from './adapters/browser';
import { checkAllTrackedPrices, checkTrackedPriceById } from './pricecheck';
import { sendDigests } from './digest';
import { findCheaperAll } from './findcheaper';
import { startTelegramBot, stopTelegramBot } from './telegrambot';

const QUEUE_NAME = 'search';
const PRICE_CHECK_QUEUE_NAME = 'price-check';

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

// Очередь разовой проверки цены одного товара (по кнопке «Проверить сейчас» из приложения).
const priceCheckWorker = new Worker(
  PRICE_CHECK_QUEUE_NAME,
  async (job) => {
    const { trackedProductId } = job.data as { trackedProductId: string };
    logger.info('Получена разовая проверка цены', { trackedProductId, jobId: job.id });
    await checkTrackedPriceById(trackedProductId);
  },
  {
    connection: config.redis,
    concurrency: 1,
  },
);
priceCheckWorker.on('failed', (job, err) =>
  logger.error('Проверка цены провалена', { jobId: job?.id, error: String(err) }),
);

logger.info('Воркер запущен и слушает очереди', {
  queues: [QUEUE_NAME, PRICE_CHECK_QUEUE_NAME],
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

// --- Дайджест снижений цен в Telegram (раз в день/неделю в заданный час) ---
let digestTimer: ReturnType<typeof setInterval> | undefined;
let lastDailyDigest = '';
let lastWeeklyDigest = '';
function scheduleDigests() {
  const tick = () => {
    const now = new Date();
    if (now.getHours() !== config.digest.hour) return;
    const dayKey = now.toISOString().slice(0, 10);
    if (lastDailyDigest !== dayKey) {
      lastDailyDigest = dayKey;
      sendDigests('daily').catch((e) => logger.error('Дайджест(день): сбой', { error: String(e) }));
    }
    // Еженедельный — по понедельникам (getDay()===1).
    if (now.getDay() === 1 && lastWeeklyDigest !== dayKey) {
      lastWeeklyDigest = dayKey;
      sendDigests('weekly').catch((e) => logger.error('Дайджест(неделя): сбой', { error: String(e) }));
    }
  };
  digestTimer = setInterval(tick, 60 * 60 * 1000); // ежечасная проверка
  tick();
  logger.info('Дайджест: cron запланирован', { hour: config.digest.hour });
}
scheduleDigests();

// --- Cron «найти дешевле» на других маркетплейсах ---
let findCheaperTimer: ReturnType<typeof setInterval> | undefined;
function scheduleFindCheaper() {
  const intervalMin = config.findCheaper.intervalMin;
  if (intervalMin <= 0) {
    logger.info('Найти дешевле: cron выключен (FINDCHEAPER_INTERVAL_MIN=0)');
    return;
  }
  const run = () =>
    findCheaperAll().catch((e) => logger.error('Найти дешевле: сбой прогона', { error: String(e) }));
  // Стартовая задержка как у проверки цен, чтобы не нагружать сразу при старте.
  setTimeout(run, config.priceCheck.initialDelaySec * 1000);
  findCheaperTimer = setInterval(run, intervalMin * 60 * 1000);
  logger.info('Найти дешевле: cron запланирован', { intervalMin });
}
scheduleFindCheaper();

// --- Telegram-бот (привязка аккаунта + команды) ---
startTelegramBot();

async function shutdown() {
  logger.info('Остановка воркера...');
  if (priceCheckTimer) clearInterval(priceCheckTimer);
  if (digestTimer) clearInterval(digestTimer);
  if (findCheaperTimer) clearInterval(findCheaperTimer);
  stopTelegramBot();
  await worker.close();
  await priceCheckWorker.close();
  await closeBrowser();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
