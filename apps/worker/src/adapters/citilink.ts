import { Page } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { getBrowser, REALISTIC_UA } from './browser';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер Ситилинк (citilink.ru) на Playwright.
 *
 * Открываем публичную страницу поиска обычным браузером и разбираем карточки из DOM
 * (Ситилинк — SPA, удобного публичного JSON нет). Антибот не обходим: при защите/капче
 * возвращаем пусто и логируем — общий поиск не падает.
 *
 * ВНИМАНИЕ: селекторы Ситилинка — best-effort и могут потребовать подстройки на «живой»
 * странице под RU-IP (как у адаптеров DNS/М.Видео). headless конфигурируется (CL_HEADLESS=0).
 */
export class CitilinkAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'citilink';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const url = `https://www.citilink.ru/search/?text=${encodeURIComponent(params.query)}`;
    let context;
    try {
      const browser = await getBrowser(config.citilink.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.citilink.timeoutMs });

      const appeared = await page
        .waitForSelector('[data-meta-name*="Snippet"], a[href*="/product/"]', { timeout: 12000 })
        .then(() => true)
        .catch(() => false);

      const guarded = await page
        .$('text=/captcha|проверка браузера|robot|доступ ограничен/i')
        .then((el) => Boolean(el))
        .catch(() => false);
      if (guarded) {
        logger.warn('Ситилинк: анти-бот-защита (капча) — пропускаю');
        return [];
      }
      if (!appeared) {
        logger.warn('Ситилинк: каталог не отрисовался (возможна антибот-защита)');
        return [];
      }

      await this.autoScroll(page);

      const collectedAt = new Date().toISOString();
      const offers = await this.fromDom(page, collectedAt);
      const limited = offers.slice(0, params.maxItems ?? config.maxItems);
      logger.info('Ситилинк: собрано товаров', { count: limited.length });
      return applyFilters(limited, params.filters);
    } catch (e) {
      logger.error('Ситилинк: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Текущая цена одного товара Ситилинка по URL детальной страницы (для трекинга цен). */
  async fetchProductPrice(productUrl: string): Promise<number | null> {
    let context;
    try {
      const browser = await getBrowser(config.citilink.headless);
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent: REALISTIC_UA,
      });
      const page = await context.newPage();
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: config.citilink.timeoutMs });
      await page
        .waitForSelector('[data-meta-price], [itemprop="price"]', { timeout: 12000 })
        .catch(() => undefined);

      const text = await page.evaluate(() => {
        const el =
          document.querySelector('[data-meta-price]') || document.querySelector('[itemprop="price"]');
        return (
          el?.getAttribute('data-meta-price') || el?.getAttribute('content') || el?.textContent || ''
        );
      });
      const digits = (text.match(/\d[\d\s ]*/)?.[0] || '').replace(/\D/g, '');
      const price = Number(digits);
      return Number.isFinite(price) && price > 0 ? price : null;
    } catch (e) {
      logger.warn('Ситилинк: не удалось получить цену товара', { productUrl, error: String(e) });
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
      const out: { href: string; title: string; price: string; image: string }[] = [];
      const seen = new Set<string>();
      const cards = Array.from(document.querySelectorAll('[data-meta-name*="Snippet"]'));
      const nodes = cards.length ? cards : Array.from(document.querySelectorAll('a[href*="/product/"]'));
      for (const node of nodes) {
        const card = node as HTMLElement;
        const link = (card.matches('a[href*="/product/"]')
          ? card
          : card.querySelector('a[href*="/product/"]')) as HTMLAnchorElement | null;
        if (!link) continue;
        const href = link.href.split('?')[0];
        if (seen.has(href)) continue;

        const titleEl = card.querySelector('[data-meta-name="Snippet__title"], [title]') as HTMLElement | null;
        const title = (titleEl?.getAttribute('title') || titleEl?.textContent || link.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        if (!title) continue;

        const priceEl = card.querySelector('[data-meta-price], [itemprop="price"]') as HTMLElement | null;
        const priceText =
          priceEl?.getAttribute('data-meta-price') ||
          priceEl?.getAttribute('content') ||
          priceEl?.textContent ||
          '';

        const img = card.querySelector('img') as HTMLImageElement | null;
        let image = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
        if (image.startsWith('//')) image = 'https:' + image;

        seen.add(href);
        out.push({ href, title, price: priceText, image });
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
        const idMatch = r.href.match(/\/product\/([^/]+)/i);
        return {
          id: `citilink:${idMatch ? idMatch[1] : r.href}`,
          marketplace: 'citilink',
          title: r.title.slice(0, 300),
          price,
          imageUrl: r.image || undefined,
          productUrl: r.href,
          availability: true,
          collectedAt,
        };
      })
      .filter((o): o is MarketplaceOffer => o !== null);
  }
}
