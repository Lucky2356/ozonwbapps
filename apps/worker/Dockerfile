# Воркер парсинга. База с предустановленными браузерами Playwright.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
# Устойчивость к нестабильной сети: увеличенные таймауты и повторные попытки.
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 180000 \
  && npm config set fetch-timeout 600000 \
  && for i in 1 2 3 4 5; do npm ci --no-audit --no-fund && break || (echo "npm ci retry $i" && sleep 10); done

COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/worker ./apps/worker

RUN npm run -w @ozonwb/db generate \
  && npm run -w @ozonwb/db build \
  && npm run -w @ozonwb/shared build \
  && npm run -w @ozonwb/worker build

CMD ["node", "apps/worker/dist/index.js"]
