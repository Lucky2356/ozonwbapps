# Выгодные предложения на маркетплейсах

Веб-приложение: пользователь выбирает маркетплейсы (Ozon, Wildberries), вводит название
товара и фильтры (рейтинг, отзывы, цена), а приложение ищет предложения, считает их
**выгодность** (scoring) и показывает топ вариантов с объяснением, почему товар выгоден.

> Данные собираются из **публичных** источников. Wildberries — через открытый JSON-каталог
> (`search.wb.ru`), Ozon — через Playwright по публичной странице поиска (best-effort).
> Парсинг вежливый: кеширование, лимиты запросов, мягкая деградация (падение одного
> источника не ломает остальные). Защита сайтов не обходится, персональные данные не собираются.

## Стек

| Слой        | Технологии                                              |
|-------------|---------------------------------------------------------|
| Frontend    | React, TypeScript, Vite, TailwindCSS, React Query, PWA  |
| Backend API | NestJS, JWT, Prisma                                     |
| Worker      | BullMQ, Playwright, адаптеры маркетплейсов              |
| Данные      | PostgreSQL, Redis                                       |
| Общее       | npm workspaces, общий пакет типов и scoring             |

## Структура (монорепо)

```
packages/
  shared/   общие типы (MarketplaceOffer и др.) и scoring-логика
  db/        Prisma-схема, миграции и клиент БД (используют api и worker)
apps/
  api/       REST API (NestJS): auth, search, favorites, tracked, marketplaces
  worker/    фоновый парсинг + scoring + запись результатов
  web/       веб-приложение (React)
```

## Быстрый старт через Docker

Требуется Docker + Docker Compose.

```bash
# 1. Скопируйте переменные окружения
cp .env.example .env
# (в .env поменяйте JWT_SECRET на длинную случайную строку)

# 2. Соберите и запустите всё
docker compose up --build
```

После старта:

- Веб-приложение: <http://localhost:8080>
- API: <http://localhost:3000/api/health>

Миграции БД применяются автоматически при старте контейнера `api`.

## Запуск одной командой (рекомендуется)

Нужны Node.js 20.6+ и Docker (для PostgreSQL и Redis).

```bash
npm install     # один раз
npm start       # БД+Redis, миграции, api+worker+web — всё сразу
```

`npm start` сам создаст `.env` (если его нет), поднимет PostgreSQL и Redis в Docker,
сгенерирует Prisma-клиент, применит миграции и запустит api, worker и web с общими логами.
Откройте <http://localhost:5173>. Остановить процессы: `Ctrl+C` (контейнеры БД/Redis останутся;
`npm run stop` — остановить и их). Для парсинга Ozon один раз: `npx playwright install chromium`.

## Запуск в облаке (GitHub Codespaces)

Проект настроен на GitHub Codespaces — облачную среду разработки, которая работает на
серверах GitHub и **не нагружает ваш компьютер**. На странице репозитория: кнопка
**Code → Codespaces → Create codespace on main**. Среда сама поставит Node, Docker,
зависимости, браузер Playwright и `xvfb` (см. `.devcontainer/devcontainer.json` и
`.devcontainer/post-create.sh`). Дальше в терминале Codespaces:

```bash
npm start                 # обычный запуск (сам поднимет Postgres/Redis)
xvfb-run -a npm start     # если нужен headed-парсинг WB/Ozon (виртуальный дисплей)
```

Порт веб-приложения (5173) пробрасывается автоматически — откроется превью в браузере.

> Секреты в Codespaces задавайте через **Settings → Secrets and variables → Codespaces**
> в репозитории (они попадут в среду как переменные окружения) — не коммитьте `.env` в git.

> **Важно про парсинг из облака.** Маркетплейсы (WB/Ozon/Ситилинк/Мегамаркет) отдают
> каталог только с **российского IP** и «видимому» (не-headless) браузеру. Дата-центр
> GitHub находится не в РФ и без дисплея, поэтому **живой поиск из Codespaces вернёт пусто**
> (сработает анти-бот). Codespaces отлично подходит для разработки, сборки, тестов и показа
> интерфейса, но реальный сбор цен нужно запускать на машине с RU-IP (локально или на RU-VPS
> с `xvfb`). Само приложение, БД и очередь в Codespaces поднимаются полностью.

## Деплой на сервер (VPS)

Чтобы сайт работал в интернете **без вашего компьютера**. Приложение полностью
контейнеризовано; продакшн-конфиг `docker-compose.prod.yml` наружу выставляет только
реверс-прокси **Caddy** (авто-HTTPS, Let's Encrypt), а БД/Redis/API/worker/web держит во
внутренней сети. Воркер-парсеры запускаются под `xvfb` (headed-браузеры) прямо в контейнере.

> Для **рабочего парсинга** WB/Ozon сервер должен иметь **российский IP** (иначе анти-бот
> вернёт пусто — как в Codespaces). Само приложение и БД работают на любом хостинге.

Разовая настройка на сервере (нужен Docker + compose-plugin):

```bash
# 1. Склонировать репозиторий и перейти в него
git clone https://github.com/Lucky2356/ozonwbapps.git /opt/ozonwbapps
cd /opt/ozonwbapps

# 2. Заполнить .env (секреты!) и добавить домен
cp .env.example .env
#   в .env задайте: DOMAIN=ваш-домен.ru  (A-запись домена -> IP сервера)
#                   ACME_EMAIL=you@mail.ru  (для Let's Encrypt, необязательно)
#                   JWT_SECRET=<длинная случайная строка>  (openssl rand -base64 48)
#                   CORS_ORIGIN=https://ваш-домен.ru
#   и остальные секреты (TELEGRAM_BOT_TOKEN и т.д.)

# 3. Собрать и запустить
docker compose -f docker-compose.prod.yml up -d --build
```

Готово: `https://ваш-домен.ru` — сайт, `https://ваш-домен.ru/api/...` — API (Caddy получит
сертификат автоматически). Миграции применяются при старте контейнера `api`.

Обновление вручную: `git pull && docker compose -f docker-compose.prod.yml up -d --build`.
Можно автоматизировать — см. workflow `.github/workflows/deploy.yml` (запускается вручную
через **Actions → Deploy**, деплоит по SSH; требует секретов `SSH_HOST/SSH_USER/SSH_KEY/DEPLOY_PATH`).

## Локальная разработка по шагам (без сборки Docker-образов)

Если нужен ручной контроль. Этот путь не собирает Docker-образы приложения,
поэтому не зависит от скачивания зависимостей в контейнерах.

```bash
cp .env.example .env
# В .env для локального запуска укажите localhost. По умолчанию dockerized PostgreSQL
# проброшен на порт 5433 (чтобы не конфликтовать с локально установленным PostgreSQL):
#   DATABASE_URL=postgresql://ozonwb:ozonwb_password@localhost:5433/ozonwb?schema=public
#   REDIS_HOST=localhost
#   REDIS_URL=redis://localhost:6379
#   CORS_ORIGIN=http://localhost:5173

# 1. Зависимости
npm install

# 2. Поднять только БД и очередь
docker compose up -d postgres redis

# 3. Клиент Prisma + общие пакеты + миграции (скрипты сами читают .env)
npm run db:generate
npm run build:shared
npm run db:migrate          # применить миграции (или db:migrate:dev для создания новых)

# 4. Для парсинга Ozon — браузер Playwright (один раз)
npx playwright install chromium

# 5. Запуск в трёх терминалах (api и worker сами подхватывают .env из корня):
npm run dev:api      # http://localhost:3000
npm run dev:worker   # слушает очередь
npm run dev:web      # http://localhost:5173 — открыть в браузере
```

Откройте <http://localhost:5173>, зарегистрируйтесь и выполните поиск.

> Замечание: живые данные зависят от антибот-защиты маркетплейсов. Wildberries может
> ограничивать частые запросы (HTTP 429); Ozon защищён сильнее. При блокировке источник
> возвращает пусто (поиск не падает) — это штатная деградация.

## Диагностика парсеров

Если какой-то маркетплейс возвращает 0 товаров, на RU-IP запустите дамп его страницы поиска —
скрипт сохранит отрисованный HTML и скриншот в папку `diag/` и напечатает счётчики ссылок:

```bash
node scripts/diag.mjs ozon "наушники"
node scripts/diag.mjs citilink "кофеварка"
# Маркетплейсы: ozon | wildberries | citilink | megamarket
```

Для разбора цен Wildberries (расхождение цены в выдаче и на странице товара — обычно это
цена «с WB-кошельком»): `npm run wb:diag -- "<товар>"` печатает ценовой объект (`basic`/`product`).

## Тесты

```bash
npm test                         # все воркспейсы
npm test -w @ozonwb/shared       # scoring
npm test -w @ozonwb/worker       # нормализация Wildberries
npm test -w @ozonwb/api          # auth
```

## Как работает поиск

1. `POST /api/search` создаёт задачу (статус `processing`) и кладёт job в очередь BullMQ.
2. **Worker** берёт задачу, запускает адаптеры выбранных маркетплейсов параллельно
   (с кешем и rate-limit), нормализует данные в единый формат, убирает дубли,
   считает scoring и сохраняет результаты.
3. Фронтенд опрашивает `GET /api/search/{id}` до статуса `completed`, затем
   загружает `GET /api/search/{id}/results`.

### Scoring (выгодность)

Балл 0–100 = взвешенная сумма факторов (веса в `packages/shared/src/scoring.config.ts`,
переопределяются переменными `SCORE_WEIGHT_*`):

```
score = priceScore*0.4 + ratingScore*0.25 + reviewsScore*0.15 + discountScore*0.1 + sellerScore*0.1
```

- цена относительно средней по выборке;
- рейтинг товара; количество отзывов (лог-шкала);
- размер скидки; рейтинг продавца;
- **подозрительно низкая цена** и **отсутствие отзывов** снижают доверие.

Каждая карточка показывает причины: «Цена ниже средней на 12%», «Рейтинг 4.8»,
«Более 1500 отзывов» и т.д.

## API (основное)

```
POST   /api/auth/register      { email, password }
POST   /api/auth/login         { email, password }
GET    /api/auth/me

GET    /api/marketplaces
POST   /api/search             { query, marketplaces[], filters, sort }
GET    /api/search/:id
GET    /api/search/:id/results
GET    /api/search/history

POST   /api/favorites
GET    /api/favorites
DELETE /api/favorites/:id

POST   /api/tracked-products
GET    /api/tracked-products
POST   /api/tracked-products/:id/check     # разовая проверка цены сейчас
DELETE /api/tracked-products/:id

GET    /api/notifications
GET    /api/notifications/unread-count
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
DELETE /api/notifications/clear

GET    /api/profile
PATCH  /api/profile               { telegramChatId }
POST   /api/profile/telegram/link-code
```

Все маршруты, кроме `auth/*` и `marketplaces`, требуют заголовок `Authorization: Bearer <token>`.

## Отслеживание цен и уведомления

- Нажмите колокольчик у товара, чтобы отслеживать его цену (можно задать целевую цену).
- Worker по расписанию (`PRICE_CHECK_INTERVAL_MIN`, по умолчанию каждые 6 ч) заново
  снимает цены отслеживаемых товаров, дописывает историю цен (график на странице
  «Отслеживание») и обновляет текущую цену. Кнопка «Проверить сейчас» у товара
  ставит разовую проверку в очередь без ожидания расписания.
- При снижении цены или достижении цели создаётся **уведомление** в приложении
  (страница «Уведомления» с бейджем непрочитанных).

### Telegram-бот

Если задать `TELEGRAM_BOT_TOKEN` (бот от [@BotFather](https://t.me/BotFather)), worker
поднимает бота на long polling, а уведомления дублируются в Telegram. Подключение:

1. В приложении: **Настройки → Подключить Telegram** — генерируется одноразовый код и
   открывается чат с ботом по deep-link `t.me/<bot>?start=<код>`.
2. Пользователь жмёт «Запустить» — бот ловит `/start <код>`, привязывает chatId к аккаунту
   и подтверждает. Статус в настройках обновляется автоматически.

Команды бота: `/start <код>` — привязать аккаунт, `/stop` — отключить уведомления, `/help`.
Альтернатива без deep-link: ввести Chat ID вручную (скрытый блок в настройках).

## Добавление нового маркетплейса

1. Создайте адаптер `apps/worker/src/adapters/<name>.ts`, реализующий интерфейс
   `MarketplaceAdapter` (метод `search`, возвращающий `MarketplaceOffer[]`).
2. Зарегистрируйте его в `apps/worker/src/adapters/registry.ts`.
3. Добавьте запись в каталог `apps/api/src/marketplaces/marketplaces.controller.ts`.
4. Включите id в `ENABLED_MARKETPLACES`.
5. (Опционально) реализуйте `fetchProductPrice(productUrl)` — тогда товар участвует
   в отслеживании цен и уведомлениях.

Остальной код (API, очередь, scoring, фронтенд) менять не нужно. Так добавлены
**Ситилинк** (`citilink`) и **Мегамаркет** (`megamarket`) — включаются через
`ENABLED_MARKETPLACES` (надёжнее на «чистом» RU-IP, см. `CL_HEADLESS` / `MM_HEADLESS`).

> Ранее были адаптеры Яндекс.Маркет, DNS и М.Видео — удалены, т.к. их анти-бот-защита
> (SmartCaptcha / DDoS-Guard) не отдавала каталог даже видимому браузеру. При необходимости
> их можно восстановить из истории git.

## Что готово (MVP)

- Регистрация/вход (JWT), защищённые маршруты.
- Поиск с выбором маркетплейсов и фильтрами (рейтинг, отзывы, цена), сортировки.
- Реальные данные Wildberries; Ozon, Ситилинк и Мегамаркет best-effort через Playwright.
- Scoring выгодности с объяснениями, топ-предложения.
- Сравнение цен между маркетплейсами: одинаковые товары группируются, видно где дешевле
  и сколько можно сэкономить (режим «Сравнить цены» на результатах и в избранном).
- Экспорт результатов и избранного в CSV.
- История поисков, избранное, отслеживаемые товары с графиком цен; отслеживание прямо из избранного.
- История цен по cron + уведомления о снижении цены (в приложении и в Telegram).
- Умные алерты: настраиваемый порог снижения, исторический минимум, дайджест в Telegram.
- «Найти дешевле»: авто-поиск того же товара на других маркетплейсах (опционально).
- Целевая цена при отслеживании (уведомить, когда цена станет ниже заданной).
- Смена пароля; страница состояния парсеров (по логам за 24 ч).
- User-friendly интерфейс: подсказка «как это работает», пояснение балла выгодности,
  примеры-запросы, всплывающие уведомления (тосты), подтверждение удалений,
  пересортировка результатов и бейдж «лучшая цена», скелетоны загрузки, aria-label.
- Адаптивный UI, тёмная/светлая тема, PWA-манифест.
- Docker Compose для запуска всего стека.

## Упаковка в приложение (Capacitor / Tauri)

Веб-сборку (`apps/web/dist`) можно завернуть в нативное приложение. Зависимости CLI уже в
`apps/web` (`@capacitor/*`, `@tauri-apps/cli`); сами нативные сборки требуют системных
инструментов и выполняются на вашей машине.

> ВАЖНО: адрес API «зашивается» в фронт на этапе сборки из `VITE_API_URL`. Для приложения
> укажите публичный адрес вашего сервера:
> `VITE_API_URL=https://ваш-сервер npm run build --workspace @ozonwb/web`
> (по умолчанию `http://localhost:3000`, доступного только на dev-машине).

**Android (Capacitor)** — нужен JDK 17 и Android Studio (Android SDK):
```bash
npm run build --workspace @ozonwb/web         # собрать веб в dist
cd apps/web
npx cap add android                            # один раз — создаёт папку android/
npm run cap:sync                               # копирует dist в нативный проект
npm run cap:android                            # открыть в Android Studio (Run/Build APK)
```
Конфиг — `apps/web/capacitor.config.ts` (appId `ru.vygoda.app`, webDir `dist`).

**Windows/desktop (Tauri)** — нужен Rust (rustup) и системные WebView-зависимости:
```bash
cd apps/web
npm run tauri init                             # один раз — создаёт src-tauri/
#   frontendDist → ../dist, beforeBuildCommand → "npm run build"
npm run tauri build                            # собрать установщик под текущую ОС
```

## Что дальше (после MVP)

- Другие маркетплейсы — новыми адаптерами.
- Экспериментальный парсинг по ссылке на категорию.
