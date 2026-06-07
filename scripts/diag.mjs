#!/usr/bin/env node
/**
 * Диагностика парсинга страницы поиска любого маркетплейса.
 * Запуск (нужен RU-IP и установленный Playwright):
 *   node scripts/diag.mjs ozon "наушники"
 *   node scripts/diag.mjs citilink "кофеварка"
 * Маркетплейсы: ozon | wildberries | citilink | megamarket
 *
 * Что делает: открывает обычный (не headless) браузер, ждёт прогрузки, скроллит,
 * сохраняет в папку diag/ отрисованный HTML и скриншот, печатает счётчики ссылок на
 * товары и несколько примеров «ссылка → ближайшая цена». По этим данным уточняются селекторы.
 * Пришлите вывод и при необходимости содержимое HTML/скриншот.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const URLS = {
  ozon: (q) => `https://www.ozon.ru/search/?text=${encodeURIComponent(q)}`,
  wildberries: (q) => `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(q)}`,
  citilink: (q) => `https://www.citilink.ru/search/?text=${encodeURIComponent(q)}`,
  megamarket: (q) => `https://megamarket.ru/search/?q=${encodeURIComponent(q)}`,
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const mp = (process.argv[2] || '').trim();
const query = process.argv.slice(3).join(' ').trim() || 'наушники';

if (!URLS[mp]) {
  console.log('Укажите маркетплейс:', Object.keys(URLS).join(' | '));
  console.log('Пример: node scripts/diag.mjs ozon "наушники"');
  process.exit(1);
}

(async () => {
  const url = URLS[mp](query);
  console.log(`ДИАГНОСТИКА ${mp} | запрос: ${JSON.stringify(query)}`);
  console.log('URL:', url);

  const { chromium } = await import('playwright');
  const headless = process.env.DIAG_HEADLESS === '1';
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({ locale: 'ru-RU', userAgent: UA, viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
      await page.waitForTimeout(900);
    }

    const captcha = await page
      .$('text=/captcha|проверка браузера|robot|DDoS-Guard|доступ ограничен/i')
      .then((el) => Boolean(el))
      .catch(() => false);
    console.log('Признак капчи/защиты:', captcha);

    const stats = await page.evaluate(() => {
      const patterns = ['/product', '/detail.aspx', '/catalog/details/', '/products/'];
      const counts = {};
      for (const p of patterns) counts[p] = document.querySelectorAll(`a[href*="${p}"]`).length;

      // Несколько примеров: ссылка → ближайшая цена ₽ в предке.
      const priceRe = new RegExp('\\d[\\d\\u00a0\\u202f\\u2009 ]{1,12}\\s*₽');
      const samples = [];
      const links = Array.from(document.querySelectorAll('a[href]')).filter((a) =>
        /\/product|\/detail\.aspx|\/catalog\/details\/|\/products\//.test(a.getAttribute('href') || ''),
      );
      for (const a of links.slice(0, 8)) {
        let el = a;
        let hops = 0;
        let priceText = '';
        while (el && hops < 7) {
          const t = el.textContent || '';
          const m = t.match(priceRe);
          if (m) { priceText = m[0]; break; }
          el = el.parentElement;
          hops++;
        }
        samples.push({
          href: (a.href || '').split('?')[0].slice(0, 90),
          title: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
          price: priceText,
        });
      }
      return { counts, samples, title: document.title };
    });

    console.log('Заголовок страницы:', stats.title);
    console.log('Ссылок по шаблонам:', JSON.stringify(stats.counts));
    console.log('Примеры (ссылка → цена):');
    for (const s of stats.samples) console.log('  -', JSON.stringify(s));

    mkdirSync('diag', { recursive: true });
    const html = await page.content();
    const base = `diag/${mp}-${Date.now()}`;
    writeFileSync(`${base}.html`, html, 'utf8');
    await page.screenshot({ path: `${base}.png`, fullPage: false }).catch(() => {});
    console.log(`Сохранено: ${base}.html и ${base}.png`);
  } catch (e) {
    console.log('Ошибка:', String(e).slice(0, 300));
  } finally {
    await browser.close();
  }
  console.log('\nГотово. Пришлите вывод; при необходимости — HTML из diag/.');
})();
