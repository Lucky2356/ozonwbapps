import { MarketplaceOffer, SearchParams } from '@ozonwb/shared';
import { MarketplaceAdapter } from './types';
import { applyFilters, num } from './base';
import { config } from '../config';
import { logger } from '../logger';

/**
 * Адаптер Wildberries — использует публичный JSON-каталог search.wb.ru.
 * Это открытый endpoint, который сам сайт WB вызывает с фронтенда: персональные данные
 * не собираются, защита не обходится. Версия API вынесена в конфиг (WB_SEARCH_VERSION).
 */
export class WildberriesAdapter implements MarketplaceAdapter {
  readonly marketplaceName = 'wildberries';

  async search(params: SearchParams): Promise<MarketplaceOffer[]> {
    const collectedAt = new Date().toISOString();

    // 1. Основной поиск.
    let json = await this.fetchJson(this.buildSearchUrl(params.query));
    let products: any[] = json?.data?.products ?? json?.products ?? [];

    // 2. Если WB вернул "preset" без инлайн-товаров — догружаем товары по preset.
    if (products.length === 0) {
      const presetId = this.extractPreset(json);
      if (presetId) {
        logger.info('WB: ответ-preset, догружаем каталог', { presetId });
        json = await this.fetchJson(this.buildPresetUrl(presetId));
        products = json?.data?.products ?? json?.products ?? [];
      }
    }

    if (products.length === 0) {
      logger.warn('WB: товары не получены (preset/empty или rate-limit)');
      return [];
    }

    const offers = products
      .slice(0, params.maxItems ?? config.maxItems)
      .map((p) => this.normalize(p, collectedAt))
      .filter((o): o is MarketplaceOffer => o !== null);

    return applyFilters(offers, params.filters);
  }

  /** Запрос JSON с реалистичными заголовками и одной повторной попыткой на 429. */
  private async fetchJson(url: string, attempt = 0): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: '*/*',
          'Accept-Language': 'ru-RU,ru;q=0.9',
          Origin: 'https://www.wildberries.ru',
          Referer: 'https://www.wildberries.ru/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
        signal: controller.signal,
      });

      if (res.status === 429 && attempt < 2) {
        clearTimeout(timeout);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        return this.fetchJson(url, attempt + 1);
      }
      if (!res.ok) {
        logger.warn('WB: непустой статус ответа', { status: res.status });
        return null;
      }
      // WB иногда отдаёт text/plain или JSON с мусорным хвостом — парсим устойчиво.
      const text = await res.text();
      return this.safeParse(text);
    } catch (e) {
      logger.error('WB: ошибка запроса', { error: String(e) });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Толерантный разбор JSON: при мусоре в конце обрезаем до последней закрывающей скобки. */
  private safeParse(text: string): any {
    if (!text) return null;
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
      logger.warn('WB: не удалось разобрать ответ как JSON');
      return null;
    }
  }

  /** WB иногда отдаёт ссылку на preset-каталог вместо инлайн-товаров. */
  private extractPreset(json: any): string | null {
    const val: string | undefined = json?.metadata?.catalog_value;
    if (val && val.startsWith('preset=')) return val.slice('preset='.length);
    return null;
  }

  private buildSearchUrl(query: string): string {
    const v = config.wb.searchVersion;
    const qs = new URLSearchParams({
      appType: '1',
      curr: 'rub',
      dest: config.wb.dest,
      lang: 'ru',
      page: '1',
      query,
      resultset: 'catalog',
      sort: 'popular',
      spp: '30',
      suppressSpellcheck: 'false',
    });
    return `https://search.wb.ru/exactmatch/ru/common/${v}/search?${qs.toString()}`;
  }

  private buildPresetUrl(presetId: string): string {
    const qs = new URLSearchParams({
      appType: '1',
      curr: 'rub',
      dest: config.wb.dest,
      lang: 'ru',
      page: '1',
      preset: presetId,
      sort: 'popular',
      spp: '30',
    });
    return `https://catalog.wb.ru/catalog/preset/v2/catalog?${qs.toString()}`;
  }

  private normalize(p: any, collectedAt: string): MarketplaceOffer | null {
    const id = num(p?.id);
    if (!id) return null;

    // Цена: новые ответы кладут цену в sizes[].price.product (в копейках).
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

    const rating = num(p?.reviewRating) ?? num(p?.rating);
    const reviewsCount = num(p?.feedbacks);
    const sellerName = typeof p?.supplier === 'string' ? p.supplier : undefined;
    const sellerRating = num(p?.supplierRating);

    return {
      id: `wildberries:${id}`,
      marketplace: 'wildberries',
      title: String(p?.name ?? 'Без названия'),
      price,
      oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
      discountPercent,
      rating,
      reviewsCount,
      sellerName,
      sellerRating,
      imageUrl: this.imageUrl(id),
      productUrl: `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
      availability: true,
      collectedAt,
    };
  }

  /** Конструирует URL картинки товара по правилам basket-хостов WB. */
  private imageUrl(id: number): string {
    const vol = Math.floor(id / 100000);
    const part = Math.floor(id / 1000);
    const basket = this.basketHost(vol);
    return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/c516x688/1.webp`;
  }

  private basketHost(vol: number): string {
    const ranges: [number, string][] = [
      [143, '01'], [287, '02'], [431, '03'], [719, '04'], [1007, '05'],
      [1061, '06'], [1115, '07'], [1169, '08'], [1313, '09'], [1601, '10'],
      [1655, '11'], [1919, '12'], [2045, '13'], [2189, '14'], [2333, '15'],
      [2477, '16'], [2621, '17'], [2765, '18'], [2909, '19'], [3053, '20'],
      [3197, '21'], [3341, '22'], [3485, '23'], [3629, '24'],
    ];
    for (const [max, host] of ranges) {
      if (vol <= max) return host;
    }
    return '25';
  }
}
