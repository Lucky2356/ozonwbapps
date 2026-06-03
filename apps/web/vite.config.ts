import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: {
      // Импортируем TS-исходник shared напрямую: dist собран как CommonJS (__exportStar),
      // и Rollup не видит его именованные экспорты статически. Источник — ESM, экспорты резолвятся.
      '@ozonwb/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Выгодные предложения',
        short_name: 'Выгода',
        description: 'Поиск самых выгодных товаров на маркетплейсах',
        theme_color: '#2563eb',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
