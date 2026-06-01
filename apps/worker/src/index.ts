import { Worker } from 'bullmq';
import { config } from './config';
import { logger } from './logger';
import { processSearch } from './processor';
import { OzonAdapter } from './adapters/ozon';

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

async function shutdown() {
  logger.info('Остановка воркера...');
  await worker.close();
  await OzonAdapter.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
