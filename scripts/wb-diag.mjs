#!/usr/bin/env node
/**
 * Диагностика Wildberries API. Запуск:
 *   npm run wb:diag                 (запрос по умолчанию "телефон")
 *   npm run wb:diag -- "наушники"   (свой запрос)
 *
 * Печатает понятный отчёт: что именно вернул WB (статус, товары, preset),
 * и пробует догрузить товары по preset. Скопируйте весь вывод и пришлите его.
 */
const query = process.argv.slice(2).join(' ').trim() || 'телефон';
const dest = process.env.WB_DEST || '-1257786';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const headers = {
  Accept: '*/*',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  Origin: 'https://www.wildberries.ru',
  Referer: 'https://www.wildberries.ru/',
  'User-Agent': UA,
};

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const end = text.lastIndexOf('}');
    if (end > 0) {
      try {
        return JSON.parse(text.slice(0, end + 1));
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

function productsOf(json) {
  return (json && ((json.data && json.data.products) || json.products)) || [];
}

async function hit(label, url) {
  console.log('\n=== ' + label + ' ===');
  console.log('URL:', url);
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log('HTTP:', res.status, '| content-type:', res.headers.get('content-type'), '| bytes:', text.length);
    const json = safeParse(text);
    if (!json) {
      console.log('Тело не разобралось как JSON. Первые 200 символов:');
      console.log(text.slice(0, 200));
      return null;
    }
    const products = productsOf(json);
    console.log('Товаров инлайн:', products.length);
    if (json.metadata) {
      console.log(
        'metadata.catalog_type:',
        json.metadata.catalog_type,
        '| catalog_value:',
        json.metadata.catalog_value,
        '| is_empty:',
        json.metadata.is_empty,
      );
    }
    if (products[0]) {
      const p = products[0];
      const size = Array.isArray(p.sizes) ? p.sizes[0] : undefined;
      console.log('Пример товара:', {
        id: p.id,
        name: p.name,
        priceProduct: size && size.price && size.price.product,
        priceBasic: size && size.price && size.price.basic,
        salePriceU: p.salePriceU,
        priceU: p.priceU,
        rating: p.reviewRating || p.rating,
        feedbacks: p.feedbacks,
        supplier: p.supplier,
      });
    }
    return json;
  } catch (e) {
    console.log('Ошибка запроса:', String(e));
    return null;
  }
}

function searchUrl(v, q, d) {
  const qs = new URLSearchParams({
    appType: '1',
    curr: 'rub',
    dest: d,
    lang: 'ru',
    page: '1',
    query: q,
    resultset: 'catalog',
    sort: 'popular',
    spp: '30',
    suppressSpellcheck: 'false',
  });
  return `https://search.wb.ru/exactmatch/ru/common/${v}/search?${qs}`;
}

(async () => {
  console.log('WB ДИАГНОСТИКА | запрос:', JSON.stringify(query), '| dest:', dest);

  const j = await hit('1) Поиск v13 (dest из .env)', searchUrl('v13', query, dest));

  // Если инлайн-товаров нет, но есть preset — пробуем догрузить каталог.
  const preset =
    j && j.metadata && typeof j.metadata.catalog_value === 'string' && j.metadata.catalog_value.startsWith('preset=')
      ? j.metadata.catalog_value.slice('preset='.length)
      : null;
  if (productsOf(j).length === 0 && preset) {
    const qs = new URLSearchParams({
      appType: '1',
      curr: 'rub',
      dest,
      lang: 'ru',
      page: '1',
      preset,
      sort: 'popular',
      spp: '30',
    });
    await hit('2) Догрузка по preset (catalog.wb.ru)', `https://catalog.wb.ru/catalog/preset/v2/catalog?${qs}`);
  }

  // Альтернативный dest — иногда помогает.
  if (productsOf(j).length === 0) {
    await hit('3) Поиск v13 с другим dest (123585487)', searchUrl('v13', query, '123585487'));
  }

  // Браузерная проверка (как реальный адаптер): открываем WB в Chromium и запрашиваем
  // search.wb.ru изнутри страницы — у запроса есть куки/сессия, антибот проходится лучше.
  console.log('\n=== 4) Браузерная проверка (Playwright) ===');
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ locale: 'ru-RU', userAgent: UA });
    const page = await ctx.newPage();
    const pageUrl = `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`;
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const result = await page.evaluate(async (q) => {
      const url =
        'https://search.wb.ru/exactmatch/ru/common/v13/search?appType=1&curr=rub&dest=-1257786' +
        '&lang=ru&page=1&query=' +
        encodeURIComponent(q) +
        '&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false';
      try {
        const r = await fetch(url, { credentials: 'include' });
        const t = await r.text();
        const m = t.match(/"products":\s*\[/);
        return { status: r.status, len: t.length, hasProducts: !!m, head: t.slice(0, 140) };
      } catch (e) {
        return { error: String(e) };
      }
    }, query);
    console.log('search.wb.ru изнутри браузера:', JSON.stringify(result));
    const cards = await page.evaluate(() => document.querySelectorAll('[data-nm-id]').length);
    console.log('Карточек [data-nm-id] на странице:', cards);
    await browser.close();
  } catch (e) {
    console.log('Браузерная проверка не выполнена:', String(e).slice(0, 200));
  }

  console.log('\nГотово. Скопируйте весь вывод выше и пришлите его.');
})();
