import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';

export const SEARCH_QUEUE = 'SEARCH_QUEUE';
export const SEARCH_QUEUE_NAME = 'search';

function buildConnection() {
  // BullMQ принимает либо URL, либо host/port. Поддерживаем оба варианта.
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
    };
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };
}

@Global()
@Module({
  providers: [
    {
      provide: SEARCH_QUEUE,
      useFactory: () =>
        new Queue(SEARCH_QUEUE_NAME, {
          connection: buildConnection(),
          defaultJobOptions: {
            attempts: 1,
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        }),
    },
  ],
  exports: [SEARCH_QUEUE],
})
export class QueueModule {}
