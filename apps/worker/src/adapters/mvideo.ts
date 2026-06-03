import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { getBrowser, REALISTIC_UA } from './browser';
import { extractProductsFromDom } from './domscrape';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер М.Видео (mvideo.ru) на Playwright.
 *
 * Открываем публичную страницу поиска обычным браузером и разбираем карточки из DOM
 * (М.Видео — SPA на Angular, удобного публичного JSON нет). Антибот не обходим:
 * при защите/капче возвращаем пусто и логируем — общий поиск не падает.
 *
 * ВНИМАНИЕ: селекторы М.Видео — best-effort и могут потребовать подстройки на «живой»
 * странице под RU-IP (как у адаптеров DNS/Яндекс). headless конфигурируется (MV_HEADLESS=0 — надёжнее).
 */
export class MVideoAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'mvideo';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const url = `https://www.mvideo.ru/product-list-page?q=${encodeURIComponent(params.query)}`;
    let context;
    try {
      const browser = await getBrowser(config.mvideo.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.mvideo.timeoutMs });

      const appeared = await page
        .waitForSelector('.product-cards-layout__item, [class*="product-card"], a[href*="/product"]', {
          timeout: 12000,
        })
        .then(() => true)
        .catch(() => false);

      const guarded = await page
        .$('text=/captcha|проверка браузера|robot|доступ ограничен/i')
        .then((el) => Boolean(el))
        .catch(() => false);
      if (guarded) {
        logger.warn('М.Видео: анти-бот-защита (капча) — пропускаю');
        return [];
      }
      if (!appeared) {
        logger.warn('М.Видео: каталог не отрисовался (возможна антибот-защита)');
        return [];
      }

      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      await this.autoScroll(page);

      const collectedAt = new Date().toISOString();
      let offers = await this.fromDom(page, collectedAt);
      if (offers.length === 0) {
        offers = await extractProductsFromDom(
          page,
          { marketplace: 'mvideo', linkSelector: 'a[href*="/product"]', idRegex: '(\\d{6,})' },
          collectedAt,
        );
      }
      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('М.Видео: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('М.Видео: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Текущая цена одного товара М.Видео по URL детальной страницы (для трекинга цен). */
  async fetchProductPrice(productUrl: string): Promise<number | null> {
    let context;
    try {
      const browser = await getBrowser(config.mvideo.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: config.mvideo.timeoutMs });
      await page
        .waitForSelector('.price__main-value, [class*="price"] [itemprop="price"]', { timeout: 12000 })
        .catch(() => undefined);

      const text = await page.evaluate(() => {
        const el =
          document.querySelector('.price__main-value') ||
          document.querySelector('[class*="price"] [itemprop="price"]');
        return el?.textContent || el?.getAttribute('content') || '';
      });
      const digits = (text.match(/\d[\d\s ]*/)?.[0] || '').replace(/\D/g, '');
      const price = Number(digits);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch (e) {
      logger.warn('М.Видео: не удалось получить цену товара', { productUrl, error: String(e) });
      return null;
    } finally {
      if (context) await context.close().catch(() => undefined);
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

  private async fromDom(page: Page, collectedAt: string): Promise<MarketplaceOffer[]> {
    const raw = await page.evaluate(() => {
      const out: {
        href: string;
        title: string;
        price: string;
        oldPrice: string;
        rating: string;
        reviews: string;
        image: string;
      }[] = [];
      const seen = new Set<string>();
      const cards = Array.from(
        document.querySelectorAll('.product-cards-layout__item, [class*="product-card"]'),
      );
      for (const card of cards) {
        const link = card.querySelector(
          'a.product-title__text, a[href*="/product"]',
        ) as HTMLAnchorElement | null;
        if (!link) continue;
        const href = link.href.split('?')[0];
        if (seen.has(href)) continue;

        const title = (link.getAttribute('title') || link.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!title) continue;

        const price =
          (card.querySelector('.price__main-value') as HTMLElement | null)?.textContent || '';
        const oldPrice =
          (card.querySelector('.price__sale-value, .price__old') as HTMLElement | null)
            ?.textContent || '';

        const ratingEl = card.querySelector('[itemprop="ratingValue"], .stars__value') as HTMLElement | null;
        const rating = ratingEl?.getAttribute('content') || ratingEl?.textContent || '';
        const reviews =
          (card.querySelector('[itemprop="reviewCount"], .product-rating__feedback') as HTMLElement | null)
            ?.textContent || '';

        const img = card.querySelector('img') as HTMLImageElement | null;
        let image = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
        if (image.startsWith('//')) image = 'https:' + image;

        seen.add(href);
        out.push({ href, title, price, oldPrice, rating, reviews, image });
      }
      return out;
    });

    const parsePrice = (t: string): number | undefined => {
      const n = Number((t.match(/\d[\d\s ]*/)?.[0] || '').replace(/\D/g, ''));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    return raw
      .map((r): MarketplaceOffer | null => {
        const price = parsePrice(r.price);
        if (price == null) return null;
        const oldPrice = parsePrice(r.oldPrice);
        // URL вида /products/...-<id> или /product/<id>.
        const idMatch = r.href.match(/(\d{6,})/);

        const ratingNum = Number(r.rating.replace(',', '.'));
        const reviewsNum = Number((r.reviews.match(/\d+/)?.[0] || ''));

        return {
          id: `mvideo:${idMatch ? idMatch[1] : r.href}`,
          marketplace: 'mvideo',
          title: r.title.slice(0, 300),
          price,
          oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
          discountPercent:
            oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined,
          rating: Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum : undefined,
          reviewsCount: Number.isFinite(reviewsNum) && reviewsNum > 0 ? reviewsNum : undefined,
          imageUrl: r.image || undefined,
          productUrl: r.href,
          availability: true,
          collectedAt,
        };
      })
      .filter((o): o is MarketplaceOffer => o !== null);
  }
}
