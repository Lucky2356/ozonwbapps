import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters, num } from './base';
import { getBrowser, REALISTIC_UA } from './browser';
import { config } from '../config';
import { logger } from '../logger';

/** URL картинки товара WB по правилам basket-хостов (экспортируется для тестов). */
export function wbImageUrl(id: number): string {
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const ranges: [number, string][] = [
    [143, '01'], [287, '02'], [431, '03'], [719, '04'], [1007, '05'],
    [1061, '06'], [1115, '07'], [1169, '08'], [1313, '09'], [1601, '10'],
    [1655, '11'], [1919, '12'], [2045, '13'], [2189, '14'], [2333, '15'],
    [2477, '16'], [2621, '17'], [2765, '18'], [2909, '19'], [3053, '20'],
    [3197, '21'], [3341, '22'], [3485, '23'], [3629, '24'],
  ];
  let basket = '25';
  for (const [max, host] of ranges) {
    if (vol <= max) {
      basket = host;
      break;
    }
  }
  return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/c516x688/1.webp`;
}

/** Нормализация одного товара из JSON WB в MarketplaceOffer (экспортируется для тестов). */
export function normalizeWbProduct(p: any, collectedAt: string): MarketplaceOffer | null {
  const id = num(p?.id);
  if (!id) return null;

  const size = Array.isArray(p?.sizes) ? p.sizes[0] : undefined;
  const basicKop = num(size?.price?.basic) ?? num(p?.priceU);
  const productKop = num(size?.price?.product) ?? num(p?.salePriceU) ?? basicKop;

  const price = productKop != null ? Math.round(productKop / 100) : undefined;
  const oldPrice = basicKop != null ? Math.round(basicKop / 100) : undefined;
  if (price == null || price <= 0) return null;

  let discountPercent: number | undefined;
  if (oldPrice && oldPrice > price) {
    discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
  }

  return {
    id: `wildberries:${id}`,
    marketplace: 'wildberries',
    title: String(p?.name ?? 'Без названия'),
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
    discountPercent,
    rating: num(p?.reviewRating) ?? num(p?.rating),
    reviewsCount: num(p?.feedbacks),
    sellerName: typeof p?.supplier === 'string' ? p.supplier : undefined,
    sellerRating: num(p?.supplierRating),
    imageUrl: wbImageUrl(id),
    productUrl: `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
    availability: true,
    collectedAt,
  };
}

/** Спасение валидной части JSON при мусорном хвосте анти-бота (экспортируется для тестов). */
export function salvageJson(text: string): any {
  const start = text.indexOf('{');
  if (start < 0) return null;
  for (let end = text.lastIndexOf('}'); end > start; end = text.lastIndexOf('}', end - 1)) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* try shorter */
    }
  }
  return null;
}

/**
 * Адаптер Wildberries на Playwright.
 *
 * WB закрыл прямой публичный JSON-API анти-ботом (preset-ответы + 403 на каталог + 429
 * на повторы). Поэтому открываем реальную страницу поиска wildberries.ru в браузере:
 * у запросов появляются нужные куки/анти-бот-токены, и тот же search.wb.ru отдаёт уже
 * нормальный каталог с товарами. Перехватываем эти JSON-ответы; если не вышло — читаем DOM.
 * Защиту не обходим незаконно — это обычный браузерный визит публичной страницы.
 */
export class WildberriesAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'wildberries';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const pageUrl = `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(params.query)}`;
    const jsonBodies: string[] = [];
    let context;
    try {
      const browser = await getBrowser();
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();

      // Перехватываем каталожные JSON-ответы WB (в т.ч. preset/catalog), идущие из браузера.
      page.on('response', async (resp) => {
        const u = resp.url();
        if (/wb\.ru\/.*(search|catalog)/.test(u) && resp.request().resourceType() === 'fetch') {
          try {
            const t = await resp.text();
            if (t.includes('"products"')) jsonBodies.push(t);
          } catch {
            /* ignore */
          }
        }
      });

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Ждём появления карточек (признак, что каталог отрисовался).
      const appeared = await page
        .waitForSelector('[data-nm-id], a[href*="/catalog/"][href*="/detail.aspx"]', { timeout: 15000 })
        .then(() => true)
        .catch(() => false);

      const collectedAt = new Date().toISOString();

      // Основной путь: запрашиваем search.wb.ru ИЗ КОНТЕКСТА страницы (с её куками/сессией),
      // следуя по preset при необходимости. Это даёт релевантные результаты с полными данными.
      let offers = this.fromJson(await this.fetchInPage(page, params.query), collectedAt);

      // Фоллбэк 1: перехваченные браузером JSON-ответы.
      if (offers.length === 0 && jsonBodies.length > 0) {
        logger.warn('WB: использую перехваченные JSON-ответы');
        offers = this.fromJson(jsonBodies, collectedAt);
      }
      // Фоллбэк 2: DOM — только из основной сетки результатов поиска (без рекламных
      // каруселей). На заблокированном IP сетки нет, поэтому вернём пусто, а не мусор.
      if (offers.length === 0) {
        if (!appeared) logger.warn('WB: каталог не отрисовался (возможна антибот-защита)');
        else logger.warn('WB: JSON не получен, пробую DOM');
        await this.autoScroll(page);
        offers = await this.fromDom(page, collectedAt);
        if (offers.length === 0) {
          logger.warn('WB: товары не найдены (вероятно, блокировка IP анти-ботом WB)');
        }
      }

      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('WB: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('WB: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /**
   * Выполняет запросы к search.wb.ru изнутри страницы (page.evaluate) — у них есть куки
   * и сессия реального визита, поэтому WB отдаёт нормальный каталог. Если ответ — preset
   * без товаров, догружаем каталог по preset. Возвращает массив сырых JSON-строк.
   */
  private async fetchInPage(page: Page, query: string): Promise<string[]> {
    const dest = config.wb.dest;
    try {
      // ВНИМАНИЕ: внутри page.evaluate нельзя объявлять вложенные функции —
      // tsx/esbuild оборачивает их хелпером __name, которого нет в браузере. Поэтому
      // всё реализовано инлайн через циклы и прямые вызовы fetch.
      return await page.evaluate(
        async ({ query, dest }) => {
          const bodies: string[] = [];
          const headers = { Accept: '*/*', 'Accept-Language': 'ru-RU,ru;q=0.9' };
          const q = encodeURIComponent(query);
          const productsRe = /"products":\s*\[\s*\{/;

          let presetId: string | null = null;
          for (const v of ['v13', 'v9', 'v5']) {
            const url =
              'https://search.wb.ru/exactmatch/ru/common/' +
              v +
              '/search?appType=1&curr=rub&dest=' +
              dest +
              '&lang=ru&page=1&query=' +
              q +
              '&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false';
            let t = '';
            try {
              const r = await fetch(url, { headers, credentials: 'include' });
              t = await r.text();
            } catch {
              t = '';
            }
            if (!t) continue;
            if (productsRe.test(t)) {
              bodies.push(t);
              break;
            }
            const m = t.match(/preset=(\d+)/);
            if (m) presetId = m[1];
          }

          if (bodies.length === 0 && presetId) {
            for (const v of ['v2', 'v4']) {
              const url =
                'https://catalog.wb.ru/catalog/preset/' +
                v +
                '/catalog?appType=1&curr=rub&dest=' +
                dest +
                '&lang=ru&page=1&preset=' +
                presetId +
                '&sort=popular&spp=30';
              let t = '';
              try {
                const r = await fetch(url, { headers, credentials: 'include' });
                t = await r.text();
              } catch {
                t = '';
              }
              if (t && productsRe.test(t)) {
                bodies.push(t);
                break;
              }
            }
          }
          return bodies;
        },
        { query, dest },
      );
    } catch (e) {
      logger.warn('WB: запрос изнутри страницы не удался', { error: String(e) });
      return [];
    }
  }

  private async autoScroll(page: Page): Promise<void> {
    try {
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
        await page.waitForTimeout(800);
      }
    } catch {
      /* ignore */
    }
  }

  // ------- Разбор перехваченного JSON (точные данные) -------

  private fromJson(bodies: string[], collectedAt: string): MarketplaceOffer[] {
    const byId = new Map<string, MarketplaceOffer>();
    for (const body of bodies) {
      let json: any;
      try {
        json = JSON.parse(body);
      } catch {
        json = this.salvage(body);
        if (!json) continue;
      }
      const products: any[] = json?.data?.products ?? json?.products ?? [];
      for (const p of products) {
        const offer = normalizeWbProduct(p, collectedAt);
        if (offer && !byId.has(offer.id)) byId.set(offer.id, offer);
      }
    }
    return [...byId.values()];
  }

  /** WB-защита иногда дописывает мусор в хвост — пробуем спасти валидную часть. */
  private salvage(text: string): any {
    return salvageJson(text);
  }

  // ------- Запасной разбор DOM -------

  private async fromDom(page: Page, collectedAt: string): Promise<MarketplaceOffer[]> {
    const raw = await page.evaluate(() => {
      const out: { id: string; title: string; priceText: string; href: string }[] = [];
      // Берём карточки только из основной сетки результатов, исключая рекламные карусели.
      const grid =
        document.querySelector('.product-card-list') ||
        document.querySelector('[data-tag="catalogGrid"]') ||
        document.querySelector('main') ||
        document;
      const cards = Array.from(grid.querySelectorAll('[data-nm-id], .product-card'));
      for (const card of cards) {
        // Пропускаем карточки внутри каруселей рекомендаций/рекламы.
        if (card.closest('[class*="carousel"], [class*="recommend"], [class*="banner"]')) continue;
        const link = card.querySelector('a[href*="/detail.aspx"]') as HTMLAnchorElement | null;
        const href = link?.href || '';
        const nm = card.getAttribute('data-nm-id') || (href.match(/catalog\/(\d+)\//)?.[1] ?? '');
        if (!nm) continue;
        let title = (
          card.querySelector('.product-card__name, [class*="name"]')?.textContent || ''
        )
          .replace(/\s+/g, ' ')
          .replace(/^\/+\s*/, '') // убираем мусорный префикс "/"
          .trim();
        const priceText =
          (card.querySelector('[class*="price"]')?.textContent || '').replace(/\s+/g, ' ').trim();
        out.push({ id: nm, title, priceText, href });
      }
      return out;
    });

    return raw
      .map((r): MarketplaceOffer | null => {
        const id = Number(r.id);
        if (!id) return null;
        const digits = (r.priceText.match(/\d[\d\s ]*/g) || [])[0]?.replace(/\D/g, '') ?? '';
        const price = Number(digits);
        if (!Number.isFinite(price) || price <= 0) return null;
        return {
          id: `wildberries:${id}`,
          marketplace: 'wildberries',
          title: (r.title || 'Товар Wildberries').slice(0, 300),
          price,
          imageUrl: wbImageUrl(id),
          productUrl: `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
          availability: true,
          collectedAt,
        };
      })
      .filter((o): o is MarketplaceOffer => o !== null);
  }
}
