# Сборка и запуск API (NestJS). Контекст сборки — корень монорепо.
FROM node:22-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Манифесты всех воркспейсов (для корректного npm ci с lockfile).
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Исходники, нужные для API.
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api

RUN npm run -w @ozonwb/db generate \
  && npm run -w @ozonwb/db build \
  && npm run -w @ozonwb/shared build \
  && npm run -w @ozonwb/api build

EXPOSE 3000
# При старте применяем миграции, затем запускаем сервер.
CMD ["sh", "-c", "npm run -w @ozonwb/db migrate:deploy && node apps/api/dist/main.js"]
