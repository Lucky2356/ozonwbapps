import { chromium, Browser } from 'playwright';
import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters } from './base';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер Ozon на Playwright (best-effort).
 *
 * Внимание: у Ozon сильная антибот-защита. Адаптер не обходит её незаконными способами:
 * он лишь открывает публичную страницу поиска обычным браузером и читает уже отрисованные
 * карточки. Если Ozon отдаёт капчу/блокировку — возвращаем пустой список и логируем,
 * НЕ роняя общий поиск (результаты других маркетплейсов остаются).
 */
export class OzonAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'ozon';
  private static browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!OzonAdapter.browser) {
      OzonAdapter.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      });
    }
    return OzonAdapter.browser;
  }

  static async close(): Promise<void> {
    if (OzonAdapter.browser) {
      await OzonAdapter.browser.close();
      OzonAdapter.browser = null;
    }
  }

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    if (!config.ozon.enabled) {
      logger.info('Ozon: адаптер отключён (OZON_ENABLED=false)');
      return [];
    }

    const url = `https://www.ozon.ru/search/?text=${encodeURIComponent(params.query)}&from_global=true`;
    let context;
    try {
      const browser = await this.getBrowser();
      context = await browser.newContext({
        locale: 'ru-RU',
        viewport: { width: 1366, height: 900 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.ozon.timeoutMs });

      // Ждём появления карточек товара; если не появились — вероятно блокировка.
      const appeared = await page
        .waitForSelector('a[href*="/product/"]', { timeout: 10000 })
        .then(() => true)
        .catch(() => false);

      if (!appeared) {
        logger.warn('Ozon: карточки не найдены (возможна антибот-защита)');
        return [];
      }

      const collectedAt = new Date().toISOString();
      const raw = await this.extract(page);
      const offers = raw
        .slice(0, params.maxItems ?? config.maxItems)
        .map((r) => this.toOffer(r, collectedAt))
        .filter((o): o is MarketplaceOffer => o !== null);

      return applyFilters(offers, params.filters);
    } catch (e) {
      logger.error('Ozon: ошибка парсинга', { error: String(e) });
      return [];
    } finally {
      if (context) await context.close().catch(() => undefined);
    }
  }

  /** Извлекает данные карточек из DOM (несколько эвристик, устойчиво к отсутствию полей). */
  private async extract(page: import('playwright').Page) {
    return page.evaluate(() => {
      const results: {
        href: string;
        title: string;
        priceText: string;
        oldPriceText: string;
        image: string;
        infoText: string;
      }[] = [];
      const anchors = Array.from(
        document.querySelectorAll('a[href*="/product/"]'),
      ) as HTMLAnchorElement[];
      const seen = new Set<string>();

      for (const a of anchors) {
        const href = a.href.split('?')[0];
        if (seen.has(href)) continue;

        // Поднимаемся к карточке-контейнеру.
        const card = a.closest('[data-index], .tile-root, div') ?? a;
        const text = (card.textContent ?? '').replace(/\s+/g, ' ').trim();
        const img = card.querySelector('img') as HTMLImageElement | null;
        const title = a.textContent?.trim() || img?.alt?.trim() || '';
        if (!title) continue;

        // Цены: ищем подстроки с ₽.
        const priceMatches = text.match(/\d[\d\s ]*₽/g) ?? [];
        if (priceMatches.length === 0) continue;

        seen.add(href);
        results.push({
          href,
          title,
          priceText: priceMatches[0] ?? '',
          oldPriceText: priceMatches[1] ?? '',
          image: img?.src ?? '',
          infoText: text,
        });
        if (results.length >= 60) break;
      }
      return results;
    });
  }

  private parsePrice(text: string): number | undefined {
    if (!text) return undefined;
    const digits = text.replace(/[^\d]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  private toOffer(
    r: { href: string; title: string; priceText: string; oldPriceText: string; image: string; infoText: string },
    collectedAt: string,
  ): MarketplaceOffer | null {
    const price = this.parsePrice(r.priceText);
    if (price == null) return null;
    const oldPrice = this.parsePrice(r.oldPriceText);

    // Рейтинг/отзывы — best-effort из текста карточки ("4.8 · 1 234 отзыва").
    const ratingMatch = r.infoText.match(/\b([0-5][.,]\d)\b/);
    const rating = ratingMatch ? Number(ratingMatch[1].replace(',', '.')) : undefined;
    const reviewsMatch = r.infoText.match(/(\d[\d\s ]*)\s*отзыв/i);
    const reviewsCount = reviewsMatch ? Number(reviewsMatch[1].replace(/\D/g, '')) : undefined;

    const idMatch = r.href.match(/-(\d+)\/?$/) ?? r.href.match(/\/(\d+)\/?$/);
    const externalId = idMatch ? idMatch[1] : r.href;

    let discountPercent: number | undefined;
    if (oldPrice && oldPrice > price) {
      discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
    }

    return {
      id: `ozon:${externalId}`,
      marketplace: 'ozon',
      title: r.title.slice(0, 300),
      price,
      oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
      discountPercent,
      rating,
      reviewsCount,
      imageUrl: r.image || undefined,
      productUrl: r.href,
      availability: true,
      collectedAt,
    };
  }
}
