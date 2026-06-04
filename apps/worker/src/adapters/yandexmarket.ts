import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { createParserContext } from './browser';
import { extractProductsFromDom } from './domscrape';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер Яндекс.Маркет на Playwright.
 *
 * Открываем публичную страницу поиска market.yandex.ru обычным браузером, перехватываем
 * её внутренние JSON-ответы (api/resolve...) с карточками товаров — это даёт точные поля.
 * Если JSON получить не удалось — запасной разбор DOM. Антибот не обходим: при блокировке
 * (SmartCaptcha и т.п.) возвращаем пусто и логируем — общий поиск не падает.
 *
 * ВНИМАНИЕ: у Яндекс.Маркета сильная анти-бот-защита (капча). Надёжный live-парсинг
 * вероятен с «чистого» RU-IP; в headless она срабатывает чаще — поэтому headless конфигурируем.
 */
export class YandexMarketAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'yandex_market';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const url = `https://market.yandex.ru/search?text=${encodeURIComponent(params.query)}`;
    const jsonBodies: string[] = [];
    let context;
    try {
      context = await createParserContext(config.yandex.headless);
      const page = await context.newPage();

      // Перехватываем JSON-ответы с товарами (структура страницы поиска ЯМ).
      page.on('response', async (resp) => {
        const u = resp.url();
        if (!/market\.yandex\.ru\/.*(api|resolve|search)/i.test(u)) return;
        try {
          const t = await resp.text();
          if (/"product"|"sku"|"titles"|"prices"/.test(t)) jsonBodies.push(t);
        } catch {
          /* ignore */
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.yandex.timeoutMs });

      const appeared = await page
        .waitForSelector('[data-auto="searchOrganic"], [data-zone-name="snippet"], a[href*="/product"]', {
          timeout: 12000,
        })
        .then(() => true)
        .catch(() => false);

      // Признак капчи Яндекса.
      const captcha = await page
        .$('form[action*="checkcaptcha"], .CheckboxCaptcha, [class*="captcha" i]')
        .then((el) => Boolean(el))
        .catch(() => false);
      if (captcha) {
        logger.warn('Яндекс.Маркет: показана капча (анти-бот) — пропускаю');
        return [];
      }
      if (!appeared && jsonBodies.length === 0) {
        logger.warn('Яндекс.Маркет: контент не загрузился (возможна антибот-защита)');
        return [];
      }

      await this.autoScroll(page);

      const collectedAt = new Date().toISOString();
      let offers = this.fromJson(jsonBodies, collectedAt);
      if (offers.length === 0) {
        logger.warn('Яндекс.Маркет: JSON не разобран, пробую DOM');
        offers = await this.fromDom(page, collectedAt);
      }
      if (offers.length === 0) {
        offers = await extractProductsFromDom(
          page,
          { marketplace: 'yandex_market', linkSelector: 'a[href*="/product"]', idRegex: 'product(?:--[^/]*)?/(\\d+)' },
          collectedAt,
        );
      }

      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('Яндекс.Маркет: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('Яндекс.Маркет: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Текущая цена одного товара Яндекс.Маркета по URL детальной страницы (для трекинга цен). */
  async fetchProductPrice(productUrl: string): Promise<number | null> {
    let context;
    try {
      context = await createParserContext(config.yandex.headless);
      const page = await context.newPage();
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: config.yandex.timeoutMs });
      await page
        .waitForSelector('[data-auto="price-value"], [data-auto="snippet-price-current"]', { timeout: 12000 })
        .catch(() => undefined);

      const text = await page.evaluate(() => {
        const el =
          document.querySelector('[data-auto="price-value"]') ||
          document.querySelector('[data-auto="snippet-price-current"]');
        return el?.textContent || '';
      });
      const digits = (text.match(/\d[\d\s ]*/)?.[0] || '').replace(/\D/g, '');
      const price = Number(digits);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch (e) {
      logger.warn('Яндекс.Маркет: не удалось получить цену товара', { productUrl, error: String(e) });
      return null;
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  private async autoScroll(page: Page): Promise<void> {
    try {
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
        await page.waitForTimeout(900);
      }
    } catch {
      /* ignore */
    }
  }

  // ------- Разбор перехваченного JSON -------

  private fromJson(bodies: string[], collectedAt: string): MarketplaceOffer[] {
    const byUrl = new Map<string, MarketplaceOffer>();
    for (const body of bodies) {
      let root: any;
      try {
        root = JSON.parse(body);
      } catch {
        continue;
      }
      // Структура ответов ЯМ разнородна — собираем «узлы-товары» рекурсивно.
      for (const node of this.findProductNodes(root)) {
        const offer = this.parseNode(node, collectedAt);
        if (offer && !byUrl.has(offer.productUrl)) byUrl.set(offer.productUrl, offer);
      }
    }
    return [...byUrl.values()];
  }

  /** Рекурсивно находит объекты, похожие на карточку товара (есть цена и название/ссылка). */
  private findProductNodes(node: any, depth = 0, out: any[] = []): any[] {
    if (!node || depth > 7) return out;
    if (Array.isArray(node)) {
      for (const el of node) this.findProductNodes(el, depth + 1, out);
      return out;
    }
    if (typeof node === 'object') {
      const hasPrice = node.prices?.value != null || node.price?.value != null || node.price != null;
      const hasTitle = typeof node.title === 'string' || typeof node.titles?.raw === 'string';
      if (hasPrice && hasTitle) out.push(node);
      for (const v of Object.values(node)) this.findProductNodes(v, depth + 1, out);
    }
    return out;
  }

  private parseNode(node: any, collectedAt: string): MarketplaceOffer | null {
    const title = String(node.title ?? node.titles?.raw ?? '').trim();
    const priceRaw = node.prices?.value ?? node.price?.value ?? node.price;
    const price = Number(String(priceRaw).replace(/\D/g, ''));
    if (!title || !Number.isFinite(price) || price <= 0) return null;

    const oldRaw = node.prices?.discount?.oldMin ?? node.prices?.oldMin ?? node.oldPrice;
    const oldPrice = oldRaw ? Number(String(oldRaw).replace(/\D/g, '')) : undefined;

    const slug: string | undefined =
      node.slug ?? node.urls?.encrypted ?? node.link ?? node.url ?? undefined;
    const id = node.id ?? node.productId ?? node.sku ?? slug ?? title;
    const productUrl = this.toUrl(slug, node.id ?? node.productId);

    const rating = Number(node.rating?.value ?? node.ratingValue ?? node.rating);
    const reviewsCount = Number(node.rating?.count ?? node.opinions ?? node.reviewsCount);
    const image = this.pickImage(node);

    return {
      id: `yandex_market:${id}`,
      marketplace: 'yandex_market',
      title: title.slice(0, 300),
      price,
      oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
      discountPercent:
        oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined,
      rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
      reviewsCount: Number.isFinite(reviewsCount) && reviewsCount > 0 ? reviewsCount : undefined,
      imageUrl: image,
      productUrl,
      availability: true,
      collectedAt,
    };
  }

  private pickImage(node: any): string | undefined {
    const raw =
      node.image?.url ?? node.images?.[0]?.url ?? node.picture ?? node.thumb ?? node.image ?? undefined;
    if (typeof raw !== 'string') return undefined;
    let u = raw.replace('%s', '600x600');
    if (u.startsWith('//')) u = 'https:' + u;
    return u.startsWith('http') ? u : undefined;
  }

  private toUrl(slug?: string, id?: string | number): string {
    if (typeof slug === 'string' && slug.startsWith('http')) return slug.split('?')[0];
    if (typeof slug === 'string' && slug.startsWith('/')) return 'https://market.yandex.ru' + slug.split('?')[0];
    if (id != null) return `https://market.yandex.ru/product/${id}`;
    return 'https://market.yandex.ru/';
  }

  // ------- Запасной разбор DOM -------

  private async fromDom(page: Page, collectedAt: string): Promise<MarketplaceOffer[]> {
    const raw = await page.evaluate(() => {
      const out: { href: string; title: string; price: string; oldPrice: string; image: string }[] = [];
      const seen = new Set<string>();
      const cards = Array.from(
        document.querySelectorAll('[data-zone-name="snippet"], [data-auto="snippet"], article'),
      );
      for (const card of cards) {
        const link = card.querySelector('a[href*="/product"]') as HTMLAnchorElement | null;
        if (!link) continue;
        const href = link.href.split('?')[0];
        if (seen.has(href)) continue;
        const img = card.querySelector('img') as HTMLImageElement | null;
        const titleEl = card.querySelector('[data-auto="snippet-title"], [data-zone-name="title"]');
        const title = (titleEl?.textContent || img?.alt || link.textContent || '').replace(/\s+/g, ' ').trim();
        if (!title) continue;
        const text = (card.textContent || '').replace(/\s+/g, ' ');
        const prices = text.match(/\d[\d  ]*\s*₽/g) || [];
        if (prices.length === 0) continue;
        seen.add(href);
        out.push({
          href,
          title,
          price: prices[0] ?? '',
          oldPrice: prices[1] || '',
          image: img?.src || '',
        });
      }
      return out;
    });

    const parsePrice = (t: string): number | undefined => {
      const n = Number(t.replace(/\D/g, ''));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    return raw
      .map((r): MarketplaceOffer | null => {
        const price = parsePrice(r.price);
        if (price == null) return null;
        const oldPrice = parsePrice(r.oldPrice);
        const idMatch = r.href.match(/product(?:--[^/]*)?\/(\d+)/) ?? r.href.match(/\/(\d+)/);
        return {
          id: `yandex_market:${idMatch ? idMatch[1] : r.href}`,
          marketplace: 'yandex_market',
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
