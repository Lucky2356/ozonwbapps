/**
 * Сопоставление одного и того же товара между маркетплейсами.
 *
 * На WB/Ozon/Яндекс/DNS у одного товара разные названия и нет общего идентификатора
 * (штрихкод/EAN обычно недоступны в выдаче). Поэтому группируем эвристически по названию:
 *   - нормализуем и токенизируем название;
 *   - схожесть = Jaccard по токенам со штрафом за расхождение числовых токенов
 *     (разная память/размер/количество ⇒ скорее разные модификации товара);
 *   - жадная кластеризация: оффер прикрепляется к самой похожей существующей группе.
 *
 * Логика чистая (без I/O) и покрыта юнит-тестами — её можно звать и в воркере, и на фронте.
 */

/** Шумовые слова, не помогающие отличать товары. */
const STOPWORDS = new Set([
  'для',
  'и',
  'в',
  'на',
  'по',
  'от',
  'до',
  'из',
  'с',
  'со',
  'the',
  'a',
  'of',
  'шт',
  'штук',
  'штука',
  'новый',
  'оригинал',
  'оригинальный',
  'купить',
  'доставка',
  'россия',
  'гарантия',
  'official',
  'rus',
]);

/**
 * Разбивает название на значимые токены.
 * Приводит к нижнему регистру, ё→е, оставляет буквы/цифры, выкидывает стоп-слова
 * и слишком короткие чисто-буквенные токены (но токены с цифрами сохраняет — это важные модели/объёмы).
 */
export function tokenizeTitle(title: string): string[] {
  const cleaned = title
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(/\s+/).filter((t) => {
    if (STOPWORDS.has(t)) return false;
    if (/\d/.test(t)) return true; // токены с цифрами всегда значимы
    return t.length >= 2;
  });
  return tokens;
}

/** Все числовые подстроки названия (объём памяти, размер, диагональ и т.п.). */
function numericTokens(title: string): Set<string> {
  const matches = title.toLowerCase().match(/\d+/g);
  return new Set(matches ?? []);
}

function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/**
 * Схожесть двух названий в диапазоне 0..1.
 * База — Jaccard по токенам. Если у обоих есть числовые токены и они полностью
 * не пересекаются — это разные модификации, схожесть уменьшается вдвое.
 */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(tokenizeTitle(a));
  const tb = new Set(tokenizeTitle(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  const inter = intersectionSize(ta, tb);
  const union = ta.size + tb.size - inter;
  let sim = union === 0 ? 0 : inter / union;

  // Расхождение по числам (память/размер/диагональ): если у каждой стороны есть
  // своё уникальное число, которого нет у другой, — это скорее разные модификации.
  const na = numericTokens(a);
  const nb = numericTokens(b);
  if (na.size > 0 && nb.size > 0) {
    const aHasExtra = [...na].some((n) => !nb.has(n));
    const bHasExtra = [...nb].some((n) => !na.has(n));
    if (aHasExtra && bHasExtra) sim *= 0.5;
  }
  return sim;
}

/** Минимальный набор полей оффера, нужный для группировки. */
export interface MatchableOffer {
  id: string;
  title: string;
  price: number;
  marketplace: string;
  reviewsCount?: number;
  score?: number;
}

/** Группа предложений одного (предположительно) товара с разных маркетплейсов. */
export interface OfferGroup<T extends MatchableOffer> {
  /** Идентификатор группы (id канонического оффера). */
  id: string;
  /** Каноническое название (берётся у оффера с наибольшим числом отзывов). */
  title: string;
  /** Офферы группы, отсортированы по цене по возрастанию. */
  offers: T[];
  /** Кол-во различных маркетплейсов в группе. */
  marketplaceCount: number;
  minPrice: number;
  maxPrice: number;
  /** Абсолютная экономия (maxPrice − minPrice). */
  savings: number;
  /** Экономия в процентах от максимальной цены, округлённая. */
  savingsPercent: number;
}

export interface GroupOptions {
  /** Порог схожести для объединения в группу (0..1). По умолчанию 0.45. */
  threshold?: number;
}

/** «Авторитетность» оффера для выбора канонического: больше отзывов → выше. */
function authority(o: MatchableOffer): number {
  return (o.reviewsCount ?? 0) * 1000 + (o.score ?? 0);
}

/**
 * Группирует офферы по предполагаемому совпадению товара.
 * Жадный алгоритм: офферы сортируются по авторитетности (отзывы/балл), каждый
 * прикрепляется к самой похожей группе выше порога; иначе создаёт новую группу.
 * Группы возвращаются отсортированными: сначала с большим числом маркетплейсов,
 * затем с большей абсолютной экономией.
 */
export function groupOffers<T extends MatchableOffer>(
  offers: T[],
  options: GroupOptions = {},
): OfferGroup<T>[] {
  const threshold = options.threshold ?? 0.45;
  const ordered = [...offers].sort((a, b) => authority(b) - authority(a));

  interface Cluster {
    canonical: T;
    items: T[];
  }
  const clusters: Cluster[] = [];

  for (const offer of ordered) {
    let best: Cluster | null = null;
    let bestSim = threshold;
    for (const cluster of clusters) {
      const sim = titleSimilarity(offer.title, cluster.canonical.title);
      if (sim >= bestSim) {
        bestSim = sim;
        best = cluster;
      }
    }
    if (best) best.items.push(offer);
    else clusters.push({ canonical: offer, items: [offer] });
  }

  const groups: OfferGroup<T>[] = clusters.map((c) => {
    const items = [...c.items].sort((a, b) => a.price - b.price);
    const prices = items.map((i) => i.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const savings = maxPrice - minPrice;
    const marketplaceCount = new Set(items.map((i) => i.marketplace)).size;
    return {
      id: c.canonical.id,
      title: c.canonical.title,
      offers: items,
      marketplaceCount,
      minPrice,
      maxPrice,
      savings,
      savingsPercent: maxPrice > 0 ? Math.round((savings / maxPrice) * 100) : 0,
    };
  });

  groups.sort(
    (a, b) => b.marketplaceCount - a.marketplaceCount || b.savings - a.savings,
  );
  return groups;
}
