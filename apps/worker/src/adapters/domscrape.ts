import { Page } from 'playwright';
import { MarketplaceOffer } from '@ozonwb/shared';

/**
 * Универсальный разбор карточек товара из DOM, не завязанный на конкретные CSS-классы.
 *
 * Логика: найти ссылки на страницы товара (linkSelector), для каждой подняться к
 * контейнеру-предку, где встречается цена в рублях (₽), и вытащить название, цену,
 * старую цену и картинку. Устойчиво к смене вёрстки — спасает, когда точные селекторы
 * сайта «протухли». Точность ниже, чем у заточенного парсера, но лучше нуля.
 *
 * ВАЖНО: внутри page.evaluate нельзя объявлять вложенные функции (tsx/esbuild оборачивает
 * их хелпером __name, которого нет в браузере) — поэтому тело написано на циклах без хелперов.
 */
export interface DomScrapeOptions {
  marketplace: string;
  /** Селектор ссылок на товар, напр. 'a[href*="/product/"]'. */
  linkSelector: string;
  /** Regex (как строка) для извлечения id из href; первая группа — id. */
  idRegex?: string;
}

export interface RawCard {
  href: string;
  title: string;
  price: string;
  oldPrice: string;
  image: string;
}

/** Парсит число из строки цены (удаляет всё нецифровое). */
function parsePriceText(t: string): number | undefined {
  const n = Number((t || '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Чистое преобразование «сырых» карточек DOM в офферы (id, цены, скидка, картинка).
 * Вынесено из браузерного кода — покрыто юнит-тестами.
 */
export function mapRawCards(
  raw: RawCard[],
  opts: DomScrapeOptions,
  collectedAt: string,
): MarketplaceOffer[] {
  const idRe = opts.idRegex ? new RegExp(opts.idRegex, 'i') : null;
  return raw
    .map((r): MarketplaceOffer | null => {
      const price = parsePriceText(r.price);
      if (price == null) return null;
      let oldPrice = parsePriceText(r.oldPrice);
      // Старая цена осмысленна только если она больше текущей.
      if (oldPrice != null && oldPrice <= price) oldPrice = undefined;
      const idMatch = idRe ? r.href.match(idRe) : null;
      const id = idMatch ? idMatch[1] : r.href;
      return {
        id: `${opts.marketplace}:${id}`,
        marketplace: opts.marketplace,
        title: r.title,
        price,
        oldPrice,
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

export async function extractProductsFromDom(
  page: Page,
  opts: DomScrapeOptions,
  collectedAt: string,
): Promise<MarketplaceOffer[]> {
  const raw: RawCard[] = await page.evaluate((o) => {
    const out: RawCard[] = [];
    const seen = new Set<string>();
    // Цена: число с возможными неразрывными/тонкими пробелами (разделители тысяч) + ₽.
    // Собираем через конструктор, чтобы в исходнике не было «неправильных» пробелов.
    const priceRe = new RegExp('\\d[\\d\\u00a0\\u202f\\u2009 ]{1,12}\\s*₽', 'g');
    const links = Array.from(document.querySelectorAll(o.linkSelector));
    for (const linkEl of links) {
      const a = linkEl as HTMLAnchorElement;
      const href = (a.href || '').split('?')[0];
      if (!href || seen.has(href)) continue;
      if (a.closest('[class*="carousel" i], [class*="recommend" i], [class*="banner" i]')) continue;

      // Поднимаемся к контейнеру карточки: до предка, где есть цена ₽ и текст не слишком большой.
      let card: HTMLElement = a;
      let hops = 0;
      while (card.parentElement && hops < 7) {
        const t = card.textContent || '';
        priceRe.lastIndex = 0;
        if (priceRe.test(t) && t.length < 700) break;
        card = card.parentElement;
        hops++;
      }
      const text = (card.textContent || '').replace(/\s+/g, ' ');
      priceRe.lastIndex = 0;
      const prices = text.match(priceRe) || [];
      if (prices.length === 0) continue;

      let title = (a.getAttribute('aria-label') || a.getAttribute('title') || a.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (title.length < 3) {
        const imgAlt = card.querySelector('img');
        title = (imgAlt && imgAlt.getAttribute('alt')) || '';
      }
      if (title.length < 3) continue;

      const imgEl = card.querySelector('img');
      let image = '';
      if (imgEl) {
        image =
          imgEl.getAttribute('data-src-pb') ||
          imgEl.getAttribute('data-src') ||
          imgEl.getAttribute('src') ||
          '';
      }
      if (image.indexOf('//') === 0) image = 'https:' + image;

      seen.add(href);
      out.push({
        href,
        title: title.slice(0, 300),
        price: prices[0] || '',
        oldPrice: prices[1] || '',
        image,
      });
    }
    return out;
  }, opts);

  return mapRawCards(raw, opts, collectedAt);
}
