import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { getBrowser, REALISTIC_UA } from './browser';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер Ozon на Playwright.
 *
 * Берём данные из внутреннего JSON Ozon (composer-api), который страница сама запрашивает —
 * это даёт ТОЧНЫЕ поля (название, цена, рейтинг, отзывы), в отличие от парсинга текста карточек.
 * Прокручиваем страницу, чтобы подгрузить больше товаров. Если JSON получить не удалось —
 * запасной разбор DOM. Антибот не обходим: открываем публичную страницу обычным браузером;
 * при блокировке возвращаем пусто и логируем (общий поиск не падает).
 */
export class OzonAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'ozon';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    if (!config.ozon.enabled) {
      logger.info('Ozon: адаптер отключён (OZON_ENABLED=false)');
      return [];
    }

    const url = `https://www.ozon.ru/search/?text=${encodeURIComponent(params.query)}&from_global=true`;
    const composerBodies: string[] = [];
    let context;
    try {
      const browser = await getBrowser();
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();

      // Собираем JSON-ответы Ozon с результатами поиска.
      page.on('response', async (resp) => {
        const u = resp.url();
        if (u.includes('composer-api.bx/page/json') || u.includes('entrypoint-api.bx')) {
          try {
            composerBodies.push(await resp.text());
          } catch {
            /* ignore */
          }
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.ozon.timeoutMs });

      const appeared = await page
        .waitForSelector('a[href*="/product/"]', { timeout: 12000 })
        .then(() => true)
        .catch(() => false);

      if (!appeared && composerBodies.length === 0) {
        logger.warn('Ozon: контент не загрузился (возможна антибот-защита)');
        return [];
      }

      await this.autoScroll(page);

      const collectedAt = new Date().toISOString();
      let offers = this.fromComposer(composerBodies, collectedAt);
      if (offers.length === 0) {
        logger.warn('Ozon: JSON не разобран, пробую DOM');
        offers = await this.fromDom(page, collectedAt);
      }

      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('Ozon: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('Ozon: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Прокрутка страницы для ленивой подгрузки товаров. */
  private async autoScroll(page: Page): Promise<void> {
    try {
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
        await page.waitForTimeout(900);
      }
    } catch {
      /* ignore */
    }
  }

  // ------- Разбор composer-api JSON (точные данные) -------

  private fromComposer(bodies: string[], collectedAt: string): MarketplaceOffer[] {
    const byUrl = new Map<string, MarketplaceOffer>();
    for (const body of bodies) {
      let root: any;
      try {
        root = JSON.parse(body);
      } catch {
        continue;
      }
      const states = root?.widgetStates ?? root;
      const values = states && typeof states === 'object' ? Object.values(states) : [];
      for (const v of values) {
        let parsed: any = v;
        if (typeof v === 'string') {
          try {
            parsed = JSON.parse(v);
          } catch {
            continue;
          }
        }
        const items = this.findItems(parsed);
        for (const it of items) {
          const offer = this.parseTile(it, collectedAt);
          if (offer && !byUrl.has(offer.productUrl)) byUrl.set(offer.productUrl, offer);
        }
      }
    }
    return [...byUrl.values()];
  }

  /** Находит массивы товарных «плиток» (с ссылкой на /product/). */
  private findItems(node: any, depth = 0): any[] {
    if (!node || depth > 6) return [];
    if (Array.isArray(node)) {
      // Массив, где элементы похожи на товары?
      const tiles = node.filter((el) => this.hasProductLink(el));
      if (tiles.length > 0) return tiles;
      return node.flatMap((el) => this.findItems(el, depth + 1));
    }
    if (typeof node === 'object') {
      if (Array.isArray(node.items) && node.items.some((el: any) => this.hasProductLink(el))) {
        return node.items.filter((el: any) => this.hasProductLink(el));
      }
      return Object.values(node).flatMap((v) => this.findItems(v, depth + 1));
    }
    return [];
  }

  private hasProductLink(node: any): boolean {
    return this.deepFind(node, (k, val) => typeof val === 'string' && val.includes('/product/'), 4) != null;
  }

  /** Рекурсивно ищет первое строковое значение, удовлетворяющее предикату. */
  private deepFind(
    node: any,
    pred: (key: string, val: string) => boolean,
    depth: number,
    key = '',
  ): string | null {
    if (depth < 0 || node == null) return null;
    if (typeof node === 'string') return pred(key, node) ? node : null;
    if (Array.isArray(node)) {
      for (const el of node) {
        const r = this.deepFind(el, pred, depth - 1, key);
        if (r) return r;
      }
      return null;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        const r = this.deepFind(v, pred, depth - 1, k);
        if (r) return r;
      }
    }
    return null;
  }

  /** Собирает все строковые листья (с ключами) — для эвристик. */
  private collectStrings(node: any, out: { key: string; val: string }[], depth = 0): void {
    if (depth > 7 || node == null) return;
    if (typeof node === 'string') return;
    if (Array.isArray(node)) {
      for (const el of node) this.collectStrings(el, out, depth + 1);
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string') out.push({ key: k, val: v });
        else this.collectStrings(v, out, depth + 1);
      }
    }
  }

  /** Декодирует HTML-сущности в названиях (&#x2F; -> /, &amp; -> & и т.д.). */
  private decodeHtml(s: string): string {
    return s
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parsePriceText(text: string): number | undefined {
    const digits = (text.match(/\d[\d\s ]*/g) || []).join('').replace(/\D/g, '');
    const n = Number(digits);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  private parseTile(item: any, collectedAt: string): MarketplaceOffer | null {
    const link = this.deepFind(item, (_k, v) => v.includes('/product/'), 5);
    if (!link) return null;
    const productUrl = link.startsWith('http')
      ? link.split('?')[0]
      : 'https://www.ozon.ru' + link.split('?')[0];

    const idMatch = productUrl.match(/-(\d+)\/?$/) ?? productUrl.match(/\/(\d+)\/?$/);
    const externalId = idMatch ? idMatch[1] : productUrl;

    const strings: { key: string; val: string }[] = [];
    this.collectStrings(item, strings);

    // Цены: текстовые поля с ₽. Текущая — обычно первая, старая — большего номинала.
    const priceTexts = strings.filter((s) => /₽/.test(s.val)).map((s) => this.parsePriceText(s.val));
    const prices = priceTexts.filter((n): n is number => typeof n === 'number');
    let price: number | undefined;
    let oldPrice: number | undefined;
    if (prices.length === 1) {
      price = prices[0];
    } else if (prices.length >= 2) {
      const uniq = [...new Set(prices)].sort((a, b) => a - b);
      price = uniq[0];
      oldPrice = uniq[uniq.length - 1] > uniq[0] ? uniq[uniq.length - 1] : undefined;
    }
    if (price == null) return null;

    // Название: длинная строка-текст (по ключам text/title/name), не цена и не URL.
    const titleCand = strings
      .filter(
        (s) =>
          /text|title|name|headline/i.test(s.key) &&
          s.val.length >= 5 &&
          !/₽/.test(s.val) &&
          !/^https?:/.test(s.val) &&
          /[a-zA-Zа-яА-Я]/.test(s.val),
      )
      .sort((a, b) => b.val.length - a.val.length);
    const anyTextCand = strings
      .filter((s) => s.val.length >= 8 && !/₽|https?:|\/product\//.test(s.val) && /[а-яА-Я]/.test(s.val))
      .sort((a, b) => b.val.length - a.val.length);
    const title = this.decodeHtml(titleCand[0]?.val ?? anyTextCand[0]?.val ?? 'Товар Ozon').slice(0, 300);

    // Рейтинг и отзывы.
    let rating: number | undefined;
    let reviewsCount: number | undefined;
    for (const s of strings) {
      if (rating == null) {
        const m = s.val.match(/^\s*([0-5][.,]\d)\s*$/);
        if (m) rating = Number(m[1].replace(',', '.'));
      }
      if (reviewsCount == null) {
        const m = s.val.match(/(\d[\d\s ]*)\s*(отзыв|оцен)/i);
        if (m) reviewsCount = Number(m[1].replace(/\D/g, ''));
      }
    }

    // Картинка.
    const image = this.deepFind(
      item,
      (_k, v) => /^https?:\/\/.*\.(jpg|jpeg|png|webp)/i.test(v) && /ozon/i.test(v),
      6,
    );

    let discountPercent: number | undefined;
    if (oldPrice && oldPrice > price) {
      discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
    }

    return {
      id: `ozon:${externalId}`,
      marketplace: 'ozon',
      title,
      price,
      oldPrice,
      discountPercent,
      rating,
      reviewsCount,
      imageUrl: image ?? undefined,
      productUrl,
      availability: true,
      collectedAt,
    };
  }

  // ------- Запасной разбор DOM -------

  private async fromDom(page: Page, collectedAt: string): Promise<MarketplaceOffer[]> {
    const raw = await page.evaluate(() => {
      const out: { href: string; title: string; price: string; oldPrice: string; image: string }[] = [];
      const seen = new Set<string>();
      for (const a of Array.from(document.querySelectorAll('a[href*="/product/"]')) as HTMLAnchorElement[]) {
        const href = a.href.split('?')[0];
        if (seen.has(href)) continue;
        const card = a.closest('[data-index]') ?? a.parentElement?.parentElement ?? a;
        const img = card.querySelector('img') as HTMLImageElement | null;
        const title = (img?.alt || a.textContent || '').trim();
        if (!title) continue;
        const text = (card.textContent || '').replace(/\s+/g, ' ');
        const prices = text.match(/\d[\d\s ]*₽/g) || [];
        if (prices.length === 0) continue;
        seen.add(href);
        out.push({ href, title, price: prices[0] ?? '', oldPrice: prices[1] || '', image: img?.src || '' });
      }
      return out;
    });

    return raw
      .map((r): MarketplaceOffer | null => {
        const price = this.parsePriceText(r.price);
        if (price == null) return null;
        const oldPrice = r.oldPrice ? this.parsePriceText(r.oldPrice) : undefined;
        const idMatch = r.href.match(/-(\d+)\/?$/) ?? r.href.match(/\/(\d+)\/?$/);
        return {
          id: `ozon:${idMatch ? idMatch[1] : r.href}`,
          marketplace: 'ozon',
          title: r.title.slice(0, 300),
          price,
          oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
          discountPercent:
            oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined,
          imageUrl: r.image || undefined,
          productUrl: r.href,
          availability: true,
          collectedAt,
        };
      })
      .filter((o): o is MarketplaceOffer => o !== null);
  }
}
