/**
 * Локальная загрузка .env из корня монорепо (для `npm run dev:worker` и `node dist/index.js`).
 * В Docker файла .env нет (его задаёт compose через окружение) — тогда ничего не грузим.
 * Импортируется ПЕРВЫМ в index.ts, до чтения config.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../.env'), // dist/ -> apps/worker -> apps -> root
  resolve(__dirname, '../../.env'),
];

for (const p of candidates) {
  if (existsSync(p)) {
    try {
      // Node 20.6+: встроенная загрузка .env без зависимостей. Не перезаписывает уже заданные переменные.
      (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(p);
    } catch {
      // loadEnvFile может отсутствовать на старых Node — игнорируем.
    }
    break;
  }
}
