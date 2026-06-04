import { chromium, Browser, BrowserContext } from 'playwright';

/**
 * Браузеры для Playwright-адаптеров.
 * - Ozon работает в headless.
 * - Wildberries отдаёт товары только обычному (не-headless) браузеру — headless он детектит
 *   и подменяет каталог на preset-заглушку. Поэтому WB запускаем в headed-режиме
 *   (на сервере без дисплея — через xvfb-run, либо WB_HEADLESS=1 при готовности к деградации).
 *
 * Кешируем по ключу headless, чтобы не плодить процессы.
 */
const browsers = new Map<boolean, Browser>();

export async function getBrowser(headless = true): Promise<Browser> {
  let browser = browsers.get(headless);
  if (!browser) {
    browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    });
    browsers.set(headless, browser);
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  for (const b of browsers.values()) {
    await b.close().catch(() => undefined);
  }
  browsers.clear();
}

export const REALISTIC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/**
 * Блокирует загрузку тяжёлых ресурсов (картинки, медиа, шрифты) — ускоряет парсинг в разы
 * и экономит трафик. CSS и fetch/xhr НЕ трогаем: на XHR/fetch держится перехват JSON
 * (Ozon/WB/ЯМ), а CSS нужен для корректного рендера/детекта карточек. URL картинок берём
 * из data-/src-атрибутов DOM — их блокировка запроса не убирает.
 */
async function applyResourceBlocking(context: BrowserContext): Promise<void> {
  await context.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'media' || type === 'font') return route.abort();
    return route.continue();
  });
}

/**
 * Создаёт контекст браузера со стандартными параметрами парсера (ru-RU, реалистичный UA,
 * 1366×900) и блокировкой тяжёлых ресурсов. Единая точка для всех адаптеров.
 */
export async function createParserContext(headless = true): Promise<BrowserContext> {
  const browser = await getBrowser(headless);
  const context = await browser.newContext({
    locale: 'ru-RU',
    viewport: { width: 1366, height: 900 },
    userAgent: REALISTIC_UA,
  });
  await applyResourceBlocking(context);
  return context;
}
