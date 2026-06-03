import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { getBrowser, REALISTIC_UA } from './browser';
import { extractProductsFromDom } from './domscrape';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер Мегамаркет (megamarket.ru) на Playwright.
 *
 * Открываем публичную страницу поиска обычным браузером и разбираем карточки из DOM
 * (Мегамаркет — SPA, удобного публичного JSON нет). Антибот не обходим: при защите/капче
 * возвращаем пусто и логируем — общий поиск не падает.
 *
 * ВНИМАНИЕ: селекторы Мегамаркета — best-effort и могут потребовать подстройки на «живой»
 * странице под RU-IP (как у адаптеров DNS/М.Видео). headless конфигурируется (MM_HEADLESS=0).
 */
export class MegamarketAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'megamarket';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const url = `https://megamarket.ru/search/?q=${encodeURIComponent(params.query)}`;
    let context;
    try {
      const browser = await getBrowser(config.megamarket.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.megamarket.timeoutMs });

      const appeared = await page
        .waitForSelector('[data-test="product"], .catalog-item, a[href*="/catalog/details/"]', {
          timeout: 12000,
        })
        .then(() => true)
        .catch(() => false);

      const guarded = await page
        .$('text=/captcha|проверка браузера|robot|доступ ограничен/i')
        .then((el) => Boolean(el))
        .catch(() => false);
      if (guarded) {
        logger.warn('Мегамаркет: анти-бот-защита (капча) — пропускаю');
        return [];
      }
      if (!appeared) {
        logger.warn('Мегамаркет: каталог не отрисовался (возможна антибот-защита)');
        return [];
      }

      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => undefined);
      await this.autoScroll(page);

      const collectedAt = new Date().toISOString();
      let offers = await this.fromDom(page, collectedAt);
      if (offers.length === 0) {
        offers = await extractProductsFromDom(
          page,
          {
            marketplace: 'megamarket',
            linkSelector: 'a[href*="/catalog/details/"]',
            idRegex: '/catalog/details/([^/?]+)',
          },
          collectedAt,
        );
      }
      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('Мегамаркет: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('Мегамаркет: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Текущая цена одного товара Мегамаркета по URL детальной страницы (для трекинга цен). */
  async fetchProductPrice(productUrl: string): Promise<number | null> {
    let context;
    try {
      const browser = await getBrowser(config.megamarket.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: config.megamarket.timeoutMs });
      await page
        .waitForSelector('[itemprop="price"], .sales-block-offer-price__price-final', { timeout: 12000 })
        .catch(() => undefined);

      const text = await page.evaluate(() => {
        const el =
          document.querySelector('.sales-block-offer-price__price-final') ||
          document.querySelector('[itemprop="price"]');
        return el?.textContent || el?.getAttribute('content') || '';
      });
      const digits = (text.match(/\d[\d\s ]*/)?.[0] || '').replace(/\D/g, '');
      const price = Number(digits);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch (e) {
      logger.warn('Мегамаркет: не удалось получить цену товара', { productUrl, error: String(e) });
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
      const out: { href: string; title: string; price: string; rating: string; image: string }[] = [];
      const seen = new Set<string>();
      const cards = Array.from(
        document.querySelectorAll('[data-test="product"], .catalog-item'),
      );
      const nodes = cards.length
        ? cards
        : Array.from(document.querySelectorAll('a[href*="/catalog/details/"]'));
      for (const node of nodes) {
        const card = node as HTMLElement;
        const link = (card.matches('a[href*="/catalog/details/"]')
          ? card
          : card.querySelector('a[href*="/catalog/details/"]')) as HTMLAnchorElement | null;
        if (!link) continue;
        const href = link.href.split('?')[0];
        if (seen.has(href)) continue;

        const titleEl = card.querySelector(
          '.item-title, [itemprop="name"], [title]',
        ) as HTMLElement | null;
        const title = (titleEl?.getAttribute('title') || titleEl?.textContent || link.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!title) continue;

        const priceEl = card.querySelector(
          '.item-price, [itemprop="price"]',
        ) as HTMLElement | null;
        const price = priceEl?.getAttribute('content') || priceEl?.textContent || '';

        const ratingEl = card.querySelector('[itemprop="ratingValue"]') as HTMLElement | null;
        const rating = ratingEl?.getAttribute('content') || ratingEl?.textContent || '';

        const img = card.querySelector('img') as HTMLImageElement | null;
        let image = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
        if (image.startsWith('//')) image = 'https:' + image;

        seen.add(href);
        out.push({ href, title, price, rating, image });
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
        const idMatch = r.href.match(/\/catalog\/details\/([^/]+)/i) ?? r.href.match(/(\d{6,})/);
        const ratingNum = Number(r.rating.replace(',', '.'));
        return {
          id: `megamarket:${idMatch ? idMatch[1] : r.href}`,
          marketplace: 'megamarket',
          title: r.title.slice(0, 300),
          price,
          rating: Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum : undefined,
          imageUrl: r.image || undefined,
          productUrl: r.href,
          availability: true,
          collectedAt,
        };
      })
      .filter((o): o is MarketplaceOffer => o !== null);
  }
}
