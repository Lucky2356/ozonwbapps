import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters, num } from './base';
import { getBrowser, REALISTIC_UA } from './browser';
import { config } from '../config';
import { logger } from '../logger';

/** Номер basket-хоста WB по vol (актуальные диапазоны на 2024–2025). */
export function wbBasket(vol: number): string {
  const ranges: [number, string][] = [
    [143, '01'], [287, '02'], [431, '03'], [719, '04'], [1007, '05'],
    [1061, '06'], [1115, '07'], [1169, '08'], [1313, '09'], [1601, '10'],
    [1655, '11'], [1919, '12'], [2045, '13'], [2189, '14'], [2405, '15'],
    [2621, '16'], [2861, '17'], [2978, '18'], [3120, '19'], [3263, '20'],
    [3405, '21'], [3550, '22'], [3700, '23'], [3850, '24'], [4000, '25'],
    [4160, '26'], [4320, '27'],
  ];
  for (const [max, host] of ranges) {
    if (vol <= max) return host;
  }
  return '28';
}

/** URL картинки товара WB по правилам basket-хостов (экспортируется для тестов). */
export function wbImageUrl(id: number): string {
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  return `https://basket-${wbBasket(vol)}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/1.webp`;
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

  // Поля рейтинга/отзывов в разных версиях WB API называются по-разному — пробуем все.
  const rating =
    num(p?.reviewRating) ?? num(p?.nmReviewRating) ?? num(p?.rating) ?? num(p?.reviewRatingDecimal);
  const reviewsCount = num(p?.feedbacks) ?? num(p?.nmFeedbacks) ?? num(p?.feedbackCount);
  const totalQty = num(p?.totalQuantity);

  return {
    id: `wildberries:${id}`,
    marketplace: 'wildberries',
    title: String(p?.name ?? 'Без названия'),
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
    discountPercent,
    rating,
    reviewsCount,
    sellerName: typeof p?.supplier === 'string' ? p.supplier : undefined,
    sellerRating: num(p?.supplierRating),
    imageUrl: wbImageUrl(id),
    productUrl: `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
    availability: totalQty == null ? true : totalQty > 0,
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
  /** Чтобы залогировать структуру товара лишь один раз за процесс. */
  private static loggedSample = false;

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const pageUrl = `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(params.query)}`;
    const jsonBodies: string[] = [];
    let context;
    try {
      // ВАЖНО: WB отдаёт товары только обычному (не-headless) браузеру.
      const browser = await getBrowser(config.wb.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();

      // Перехватываем ЛЮБЫЕ ответы *.wb.ru с товарами — именно так сама страница грузит каталог
      // (ручной fetch к catalog.wb.ru блокируется CORS, а запросы самой страницы проходят).
      page.on('response', async (resp) => {
        if (!/\.wb\.ru\//.test(resp.url())) return;
        try {
          const t = await resp.text();
          if (/"products":\s*\[\s*\{/.test(t)) jsonBodies.push(t);
        } catch {
          /* ignore */
        }
      });

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Ждём появления карточек (признак, что каталог отрисовался) и даём догрузиться.
      const appeared = await page
        .waitForSelector('[data-nm-id], a[href*="/catalog/"][href*="/detail.aspx"]', { timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      await this.autoScroll(page);
      await page.waitForTimeout(1500);

      const collectedAt = new Date().toISOString();

      // Основной путь: перехваченные ответы страницы (полные данные — цена/рейтинг/отзывы).
      let offers = this.fromJson(jsonBodies, collectedAt);
      let source = 'перехват';

      // Фоллбэк 1: запрос search.wb.ru изнутри страницы (+follow по preset).
      if (offers.length === 0) {
        offers = this.fromJson(await this.fetchInPage(page, params.query), collectedAt);
        source = 'fetch-in-page';
      }
      // Фоллбэк 2: DOM из основной сетки результатов (без рекламных каруселей).
      if (offers.length === 0) {
        if (!appeared) logger.warn('WB: каталог не отрисовался (возможна антибот-защита)');
        offers = await this.fromDom(page, collectedAt);
        source = 'dom';
        if (offers.length === 0) {
          logger.warn('WB: товары не найдены (headless? тогда задайте WB_HEADLESS=0)');
        }
      }

      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('WB: собрано товаров', { count: limited.length, source });
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
      // Диагностика: один раз логируем поля первого товара, чтобы видеть реальную структуру WB.
      if (products[0] && !WildberriesAdapter.loggedSample) {
        WildberriesAdapter.loggedSample = true;
        const s = products[0];
        logger.info('WB: структура товара', {
          keys: Object.keys(s),
          reviewRating: s.reviewRating,
          nmReviewRating: s.nmReviewRating,
          rating: s.rating,
          feedbacks: s.feedbacks,
          nmFeedbacks: s.nmFeedbacks,
          pics: s.pics,
        });
      }
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
    // Точные селекторы карточки WB (структура product-card, 2024–2025).
    const items = await page.evaluate(() => {
      const out: {
        id: string;
        title: string;
        priceText: string;
        oldPriceText: string;
        ratingText: string;
        reviewsText: string;
        img: string;
      }[] = [];
      const grid =
        document.querySelector('.product-card-list') ||
        document.querySelector('[data-tag="catalogGrid"]') ||
        document.querySelector('main') ||
        document;
      const cards = Array.from(grid.querySelectorAll('.product-card, article[data-nm-id]'));
      for (const card of cards) {
        if (card.closest('[class*="carousel"], [class*="recommend"], [class*="banner"]')) continue;
        const link = card.querySelector('a.j-card-link, a[href*="/detail.aspx"]') as HTMLAnchorElement | null;
        const href = link?.href || '';
        const nm = card.getAttribute('data-nm-id') || (href.match(/catalog\/(\d+)\//)?.[1] ?? '');
        if (!nm) continue;

        // Название: aria-label ссылки — чистое, без внутреннего сепаратора " / ".
        const nameEl = card.querySelector('.product-card__name');
        const sep = nameEl?.querySelector('.product-card__name-separator');
        if (sep) sep.remove();
        const title = (link?.getAttribute('aria-label') || nameEl?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();

        // Цена: текущая (ins.price__lower-price), старая (del).
        const priceText = (card.querySelector('ins.price__lower-price, .price__lower-price')?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        const oldPriceText = (card.querySelector('del')?.textContent || '').replace(/\s+/g, ' ').trim();

        // Картинка: data-src-pb (стабильный basket-URL) предпочтительнее src (гео-CDN).
        const imgEl = card.querySelector('img.j-thumbnail, img') as HTMLImageElement | null;
        let img = imgEl?.getAttribute('data-src-pb') || imgEl?.getAttribute('src') || '';
        if (img.startsWith('//')) img = 'https:' + img;

        // Рейтинг: .address-rate-mini = "4,9". Отзывы: .product-card__count = "12 940 оценок".
        const ratingText = (card.querySelector('.address-rate-mini')?.textContent || '').trim();
        const reviewsText = (card.querySelector('.product-card__count')?.textContent || '').trim();

        out.push({ id: nm, title, priceText, oldPriceText, ratingText, reviewsText, img });
      }
      return out;
    });

    const parsePrice = (t: string): number | undefined => {
      const d = (t.match(/\d[\d\s ]*/g) || [])[0]?.replace(/\D/g, '') ?? '';
      const n = Number(d);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    return items
      .map((r): MarketplaceOffer | null => {
        const id = Number(r.id);
        if (!id) return null;
        const price = parsePrice(r.priceText);
        if (price == null) return null;
        const oldPrice = parsePrice(r.oldPriceText);

        const rm = r.ratingText.match(/([0-5][.,]\d)/);
        const rating = rm ? Number(rm[1].replace(',', '.')) : undefined;

        // Отзывы: "12 940 оценок" или "1,2 тыс. оценок".
        let reviewsCount: number | undefined;
        const tk = r.reviewsText.match(/([\d.,]+)\s*тыс/i);
        const mn = r.reviewsText.match(/([\d.,]+)\s*млн/i);
        if (mn) reviewsCount = Math.round(parseFloat(mn[1].replace(',', '.')) * 1_000_000);
        else if (tk) reviewsCount = Math.round(parseFloat(tk[1].replace(',', '.')) * 1000);
        else {
          const d = (r.reviewsText.match(/\d[\d\s ]*/) || [''])[0].replace(/\D/g, '');
          reviewsCount = d ? Number(d) : undefined;
        }

        return {
          id: `wildberries:${id}`,
          marketplace: 'wildberries',
          title: (r.title || 'Товар Wildberries').slice(0, 300),
          price,
          oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
          discountPercent:
            oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined,
          rating,
          reviewsCount,
          imageUrl: r.img || wbImageUrl(id),
          productUrl: `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
          availability: true,
          collectedAt,
        };
      })
      .filter((o): o is MarketplaceOffer => o !== null);
  }
}
