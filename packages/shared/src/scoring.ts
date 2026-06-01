/**
 * Расчёт выгодности предложений (scoring) + сортировка.
 *
 * Идея: не сортировать только по цене. Балл = взвешенная сумма факторов:
 *   цена относительно средней, рейтинг, кол-во отзывов, скидка, рейтинг продавца.
 * Подозрительно низкая цена и отсутствие отзывов понижают доверие.
 */
import {
  MarketplaceOffer,
  ScoredOffer,
  SortOption,
} from './types';
import {
  ScoringWeights,
  defaultWeights,
  scoringParams as P,
} from './scoring.config';

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Средняя цена среди доступных предложений с положительной ценой. */
function meanPrice(offers: MarketplaceOffer[]): number {
  const prices = offers.filter((o) => o.availability && o.price > 0).map((o) => o.price);
  if (prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

interface SubScores {
  price: number;
  rating: number;
  reviews: number;
  discount: number;
  seller: number;
}

function computeSubScores(offer: MarketplaceOffer, mean: number): SubScores {
  // Цена: дешевле средней — лучше. mean → 0.5, бесплатно → 1, 2×средней → 0.
  let price = 0.5;
  if (mean > 0 && offer.price > 0) {
    const relative = (mean - offer.price) / mean; // >0 дешевле средней
    price = clamp01(0.5 + relative * 0.5);
  }

  // Рейтинг: 0..5 → 0..1, либо нейтрально если нет данных.
  const rating =
    typeof offer.rating === 'number' ? clamp01(offer.rating / 5) : P.neutralRating;

  // Отзывы: лог-шкала, 0 отзывов → 0.
  const reviewsCount = offer.reviewsCount ?? 0;
  const reviews =
    reviewsCount > 0
      ? clamp01(Math.log10(1 + reviewsCount) / Math.log10(1 + P.reviewsReference))
      : 0;

  // Скидка: 0..discountReference% → 0..1.
  const discountPercent = offer.discountPercent ?? 0;
  const discount = clamp01(discountPercent / P.discountReference);

  // Продавец: рейтинг 0..5 → 0..1, либо нейтрально.
  const seller =
    typeof offer.sellerRating === 'number'
      ? clamp01(offer.sellerRating / 5)
      : P.neutralSeller;

  return { price, rating, reviews, discount, seller };
}

function buildReasons(offer: MarketplaceOffer, mean: number): string[] {
  const reasons: string[] = [];

  if (mean > 0 && offer.price > 0) {
    const diff = Math.round(((mean - offer.price) / mean) * 100);
    if (diff >= 3) reasons.push(`Цена ниже средней на ${diff}%`);
    else if (diff <= -3) reasons.push(`Цена выше средней на ${Math.abs(diff)}%`);
    else reasons.push('Цена около средней по выборке');
  }

  if (typeof offer.rating === 'number') {
    if (offer.rating >= 4.5) reasons.push(`Высокий рейтинг ${offer.rating.toFixed(1)}`);
    else reasons.push(`Рейтинг ${offer.rating.toFixed(1)}`);
  }

  const reviewsCount = offer.reviewsCount ?? 0;
  if (reviewsCount >= 1000) reasons.push(`Более ${Math.floor(reviewsCount / 1000) * 1000} отзывов`);
  else if (reviewsCount > 0) reasons.push(`${reviewsCount} отзывов`);
  else reasons.push('Нет отзывов');

  if ((offer.discountPercent ?? 0) >= 5) {
    reasons.push(`Скидка ${Math.round(offer.discountPercent!)}%`);
  }

  if (typeof offer.sellerRating === 'number' && offer.sellerRating >= 4.5) {
    reasons.push(`Надёжный продавец (рейтинг ${offer.sellerRating.toFixed(1)})`);
  }

  if (offer.availability) reasons.push('Есть в наличии');

  // Предупреждения о доверии.
  if (mean > 0 && offer.price > 0 && offer.price < mean * P.suspiciousPriceRatio) {
    reasons.push('Подозрительно низкая цена — проверьте продавца');
  }
  if ((offer.discountPercent ?? 0) >= P.suspiciousDiscountThreshold) {
    reasons.push('Слишком большая скидка — возможна завышенная старая цена');
  }

  return reasons;
}

/**
 * Рассчитывает выгодность каждого предложения.
 * @param offers исходные предложения (с разных маркетплейсов)
 * @param weights веса факторов (по умолчанию defaultWeights)
 * @returns предложения с полями score (0..100) и scoreReasons
 */
export function computeScores(
  offers: MarketplaceOffer[],
  weights: ScoringWeights = defaultWeights,
): ScoredOffer[] {
  if (offers.length === 0) return [];

  const mean = meanPrice(offers);
  const totalWeight =
    weights.price + weights.rating + weights.reviews + weights.discount + weights.seller || 1;

  return offers.map((offer) => {
    const sub = computeSubScores(offer, mean);

    let base =
      (sub.price * weights.price +
        sub.rating * weights.rating +
        sub.reviews * weights.reviews +
        sub.discount * weights.discount +
        sub.seller * weights.seller) /
      totalWeight;

    // Доверие: понижаем за подозрительные сигналы.
    let trust = 1;
    if (mean > 0 && offer.price > 0 && offer.price < mean * P.suspiciousPriceRatio) {
      trust *= P.suspiciousPriceTrust;
    }
    if ((offer.reviewsCount ?? 0) === 0) {
      // Товары без отзывов не должны обгонять товары с отзывами.
      trust *= P.noReviewsTrust;
    }
    if (!offer.availability) {
      trust *= 0.5;
    }

    const score = Math.round(clamp01(base * trust) * 100);

    return {
      ...offer,
      score,
      scoreReasons: buildReasons(offer, mean),
    };
  });
}

/** Сортировка предложений по выбранному критерию. */
export function sortOffers(offers: ScoredOffer[], sort: SortOption): ScoredOffer[] {
  const sorted = [...offers];
  switch (sort) {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'reviews':
      sorted.sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
      break;
    case 'best_value':
    default:
      sorted.sort((a, b) => b.score - a.score);
      break;
  }
  return sorted;
}
