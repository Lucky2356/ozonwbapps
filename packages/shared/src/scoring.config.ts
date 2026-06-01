/**
 * Веса и параметры scoring-системы. Меняются здесь или через переменные окружения,
 * без правок самой логики расчёта.
 */

export interface ScoringWeights {
  price: number;
  rating: number;
  reviews: number;
  discount: number;
  seller: number;
}

export const defaultWeights: ScoringWeights = {
  price: 0.4,
  rating: 0.25,
  reviews: 0.15,
  discount: 0.1,
  seller: 0.1,
};

/** Параметры нормировки факторов. */
export const scoringParams = {
  /** Кол-во отзывов, дающее ~максимальный reviewsScore (лог-шкала). */
  reviewsReference: 2000,
  /** Скидка (%), дающая максимальный discountScore. */
  discountReference: 50,
  /** Скидка выше этого порога считается подозрительной (возможен фейковый oldPrice). */
  suspiciousDiscountThreshold: 80,
  /** Цена ниже этой доли от средней считается подозрительно низкой. */
  suspiciousPriceRatio: 0.4,
  /** Множитель доверия при подозрительно низкой цене. */
  suspiciousPriceTrust: 0.85,
  /** Множитель для товаров без отзывов (чтобы не обгоняли товары с отзывами). */
  noReviewsTrust: 0.7,
  /** Нейтральные значения, когда данных нет. */
  neutralRating: 0.5,
  neutralSeller: 0.5,
};

/**
 * Загрузка весов из переменных окружения (SCORE_WEIGHT_*).
 * Возвращает defaultWeights, переопределяя только заданные значения.
 */
export function loadWeightsFromEnv(env: Record<string, string | undefined> = {}): ScoringWeights {
  const num = (v: string | undefined, fallback: number): number => {
    const n = v === undefined ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    price: num(env.SCORE_WEIGHT_PRICE, defaultWeights.price),
    rating: num(env.SCORE_WEIGHT_RATING, defaultWeights.rating),
    reviews: num(env.SCORE_WEIGHT_REVIEWS, defaultWeights.reviews),
    discount: num(env.SCORE_WEIGHT_DISCOUNT, defaultWeights.discount),
    seller: num(env.SCORE_WEIGHT_SELLER, defaultWeights.seller),
  };
}
