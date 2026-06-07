import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { createParserContext } from './browser';
import { extractProductsFromDom } from './domscrape';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер DNS (dns-shop.ru) на Playwright.
 *
 * Открываем публичную страницу поиска обычным браузером и разбираем карточки из DOM
 * (DNS отдаёт каталог как HTML/AJAX, удобного публичного JSON нет). Антибот не обходим:
 * при защите (DDoS-Guard) возвращаем пусто и логируем — общий поиск не падает.
 *
 * ВНИМАНИЕ: у DNS сильная анти-бот-защита; надёжнее работает с «чистого» RU-IP.
 * headless конфигурируется (DNS_HEADLESS=0 — надёжнее против защиты).
 */
export class DnsAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'dns';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const url = `https://www.dns-shop.ru/search/?q=${encodeURIComponent(params.query)}`;
    let context;
    try {
      context = await createParserContext(config.dns.headless, false);
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.dns.timeoutMs });

      await page
        .waitForSelector('.catalog-product, a[href*="/product/"]', { timeout: 15000 })
        .catch(() => undefined);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);

      const guarded = await page
        .$('text=/DDoS-Guard|проверка браузера|captcha/i')
        .then((el) => Boolean(el))
        .catch(() => false);
      if (guarded) {
        logger.warn('DNS: анти-бот-защита (DDoS-Guard) — пропускаю');
        return [];
      }

      await this.autoScroll(page);

      const collectedAt = new Date().toISOString();
      // Сначала точный парсер, затем — универсальный фолбэк (если вёрстка изменилась).
      let offers = await this.fromDom(page, collectedAt);
      if (offers.length === 0) {
        offers = await extractProductsFromDom(
          page,
          { marketplace: 'dns', linkSelector: 'a[href*="/product/"]', idRegex: '/product/([0-9a-f-]+)' },
          collectedAt,
        );
      }
      if (offers.length === 0) {
        logger.warn('DNS: каталог не отрисовался (возможна антибот-защита)');
      }
      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('DNS: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('DNS: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Текущая цена одного товара DNS по URL детальной страницы (для трекинга цен). */
  async fetchProductPrice(productUrl: string): Promise<number | null> {
    let context;
    try {
      context = await createParserContext(config.dns.headless, false);
      const page = await context.newPage();
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: config.dns.timeoutMs });
      await page
        .waitForSelector('.product-buy__price, .product-card-price__current', { timeout: 12000 })
        .catch(() => undefined);

      const text = await page.evaluate(() => {
        const el =
          document.querySelector('.product-buy__price') ||
          document.querySelector('.product-card-price__current');
        return el?.textContent || '';
      });
      const digits = (text.match(/\d[\d\s ]*/)?.[0] || '').replace(/\D/g, '');
      const price = Number(digits);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch (e) {
      logger.warn('DNS: не удалось получить цену товара', { productUrl, error: String(e) });
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
      const cards = Array.from(document.querySelectorAll('.catalog-product'));
      for (const card of cards) {
        const link = card.querySelector('a.catalog-product__name, a[href*="/product/"]') as HTMLAnchorElement | null;
        if (!link) continue;
        const href = link.href.split('?')[0];
        if (seen.has(href)) continue;

        const title = (link.textContent || '').replace(/\s+/g, ' ').trim();
        if (!title) continue;

        const price = (card.querySelector('.product-buy__price') as HTMLElement | null)?.textContent || '';
        const oldPrice = (card.querySelector('.product-buy__prev') as HTMLElement | null)?.textContent || '';

        // Рейтинг хранится в data-rating контейнера рейтинга.
        const ratingEl = card.querySelector('[data-rating]') as HTMLElement | null;
        const rating = ratingEl?.getAttribute('data-rating') || '';
        const reviews =
          (card.querySelector('.catalog-product__rating') as HTMLElement | null)?.textContent || '';

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
        const idMatch = r.href.match(/\/product\/([0-9a-f-]+)\//i);

        const ratingNum = Number(r.rating.replace(',', '.'));
        const reviewsNum = Number((r.reviews.match(/\d+/)?.[0] || ''));

        return {
          id: `dns:${idMatch ? idMatch[1] : r.href}`,
          marketplace: 'dns',
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
