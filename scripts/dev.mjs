#!/usr/bin/env node
/**
 * Запуск всего проекта одной командой для локальной разработки: `npm start`.
 *
 * Делает по шагам:
 *  1. создаёт .env из .env.example (с localhost и портом 5433), если его нет;
 *  2. ставит зависимости, если нет node_modules;
 *  3. поднимает PostgreSQL и Redis в Docker и ждёт их готовности;
 *  4. генерирует Prisma-клиент, собирает общие пакеты, применяет миграции;
 *  5. параллельно запускает api, worker и web с префиксами в логах;
 *  6. по Ctrl+C аккуратно останавливает дочерние процессы.
 *
 * PostgreSQL и Redis (контейнеры) остаются запущенными — данные сохраняются.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const isWin = process.platform === 'win32';
const C = { cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', magenta: '\x1b[35m', red: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' };
const log = (m) => console.log(`${C.cyan}[dev]${C.reset} ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Синхронный запуск шага сборки; падаем с понятной ошибкой. */
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: isWin, cwd: root });
  if (r.status !== 0) {
    console.error(`${C.red}[dev] Команда не удалась:${C.reset} ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

/** Тихий запуск, возвращает {status, stdout}. */
function runQuiet(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: isWin, cwd: root });
  return { status: r.status, stdout: (r.stdout || '').trim() };
}

async function ensureEnv() {
  const envPath = resolve(root, '.env');
  if (existsSync(envPath)) return;
  log('.env не найден — создаю из .env.example (localhost, PostgreSQL на 5433)');
  let e = readFileSync(resolve(root, '.env.example'), 'utf8');
  e = e
    .replace('@postgres:5432', '@localhost:5433')
    .replace(/^REDIS_HOST=redis\s*$/m, 'REDIS_HOST=localhost')
    .replace(/^REDIS_URL=redis:\/\/redis:6379\s*$/m, 'REDIS_URL=redis://localhost:6379');
  writeFileSync(envPath, e);
}

function ensureDeps() {
  if (existsSync(resolve(root, 'node_modules', '.package-lock.json')) || existsSync(resolve(root, 'node_modules', 'react'))) return;
  log('Устанавливаю зависимости (npm install)…');
  run('npm', ['install']);
}

async function startInfra() {
  log('Поднимаю PostgreSQL и Redis (Docker)…');
  run('docker', ['compose', 'up', '-d', 'postgres', 'redis']);

  log('Жду готовности PostgreSQL и Redis…');
  for (let i = 0; i < 60; i++) {
    const pg = runQuiet('docker', ['compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', process.env.POSTGRES_USER || 'ozonwb']);
    const redis = runQuiet('docker', ['compose', 'exec', '-T', 'redis', 'redis-cli', 'ping']);
    if (pg.status === 0 && redis.stdout.includes('PONG')) {
      log(`${C.green}PostgreSQL и Redis готовы${C.reset}`);
      return;
    }
    await sleep(1500);
  }
  throw new Error('PostgreSQL/Redis не стали готовы за отведённое время');
}

function prepare() {
  log('Генерирую Prisma-клиент…');
  run('npm', ['run', 'db:generate']);
  log('Собираю общий пакет (shared)…');
  run('npm', ['run', 'build:shared']);
  log('Применяю миграции БД…');
  run('npm', ['run', 'db:migrate']);
}

function checkPlaywright() {
  // Ozon использует Playwright; если браузера нет — предупреждаем (поиск всё равно работает по WB).
  const r = runQuiet('npx', ['playwright', '--version']);
  if (r.status !== 0) {
    log(`${C.yellow}Playwright не найден. Для парсинга Ozon выполните: npx playwright install chromium${C.reset}`);
  }
}

function startServers() {
  const targets = [
    { name: 'api', color: C.green, script: 'dev:api' },
    { name: 'worker', color: C.magenta, script: 'dev:worker' },
    { name: 'web', color: C.yellow, script: 'dev:web' },
  ];
  const procs = [];

  for (const t of targets) {
    const p = spawn('npm', ['run', t.script], { shell: isWin, cwd: root, env: process.env });
    const prefix = `${t.color}[${t.name}]${C.reset} `;
    const pipe = (stream, out) => {
      let buf = '';
      stream.on('data', (chunk) => {
        buf += chunk.toString();
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) out.write(prefix + line + '\n');
      });
    };
    pipe(p.stdout, process.stdout);
    pipe(p.stderr, process.stderr);
    p.on('exit', (code) => console.log(`${prefix}${C.dim}процесс завершён (код ${code})${C.reset}`));
    procs.push(p);
  }

  log(`${C.green}Всё запущено.${C.reset} Откройте ${C.cyan}http://localhost:5173${C.reset} (API: http://localhost:3000). Ctrl+C — остановить.`);

  const shutdown = () => {
    log('Останавливаю процессы…');
    for (const p of procs) {
      try { p.kill(); } catch { /* ignore */ }
    }
    setTimeout(() => process.exit(0), 800);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main() {
  await ensureEnv();
  ensureDeps();
  await startInfra();
  prepare();
  checkPlaywright();
  startServers();
}

main().catch((e) => {
  console.error(`${C.red}[dev] Ошибка запуска:${C.reset} ${e.message}`);
  process.exit(1);
});
