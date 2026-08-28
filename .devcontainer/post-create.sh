#!/usr/bin/env bash
# Разовая настройка облачной среды (GitHub Codespaces / Dev Container).
# Запускается автоматически после создания контейнера (postCreateCommand).
set -euo pipefail

echo "==> Устанавливаю зависимости (npm ci)…"
npm ci

echo "==> Ставлю xvfb (виртуальный дисплей для headed-браузеров) и системные зависимости Chromium…"
sudo apt-get update -y
sudo apt-get install -y xvfb

echo "==> Устанавливаю браузер Playwright (Chromium) с системными зависимостями…"
npx playwright install --with-deps chromium

echo ""
echo "======================================================================"
echo " Готово. Дальше:"
echo "   npm start                 # обычный запуск (сам поднимет Postgres/Redis в Docker)"
echo "   xvfb-run -a npm start     # если нужен headed-парсинг WB/Ozon (нужен дисплей)"
echo ""
echo " Секреты (.env) в Codespaces задаются через Codespaces secrets в"
echo " настройках репозитория — НЕ коммить их в git. Если .env нет,"
echo " 'npm start' создаст его из .env.example со значениями по умолчанию."
echo ""
echo " ВНИМАНИЕ: живой парсинг WB/Ozon в облаке может не отдавать товары —"
echo " маркетплейсы блокируют не-российские IP. Разработка/сборка/тесты/UI"
echo " работают полностью; реальный парсинг — с российского IP (локально или RU-VPS)."
echo "======================================================================"
