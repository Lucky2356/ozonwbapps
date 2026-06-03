import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Конфигурация Capacitor для упаковки веб-приложения в Android (и при желании iOS).
 * Сборка веба кладётся в `dist` (webDir). Перед `cap sync` соберите фронт: `npm run build`.
 *
 * ВАЖНО: в упакованном приложении API берётся из VITE_API_URL на этапе сборки фронта —
 * укажите адрес вашего сервера: `VITE_API_URL=https://ваш-сервер npm run build`.
 * Иначе приложение будет стучаться в http://localhost:3000, которого на телефоне нет.
 */
const config: CapacitorConfig = {
  appId: 'ru.vygoda.app',
  appName: 'Выгода',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
