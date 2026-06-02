import { formatPrice } from '../lib/format';

interface Point {
  price: number;
  recordedAt: string;
}

/**
 * График истории цен (SVG): линия с заливкой, точки минимума/максимума и подписи
 * текущей/мин/макс цены. До 2 точек показываем заглушку (данных ещё мало).
 */
export function PriceHistoryChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400 dark:bg-slate-800/50">
        История цен появится после нескольких проверок цены.
      </div>
    );
  }

  const w = 240;
  const h = 56;
  const pad = 4;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const current = prices[prices.length - 1];

  const xy = (price: number, i: number) => {
    const x = (i / (points.length - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((price - min) / range) * (h - pad * 2);
    return { x, y };
  };

  const coords = points.map((p, i) => xy(p.price, i));
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  const minIdx = prices.indexOf(min);
  const maxIdx = prices.indexOf(max);
  const minPt = xy(min, minIdx);
  const maxPt = xy(max, maxIdx);

  // Динамика: текущая относительно первой записи.
  const first = prices[0];
  const deltaPct = first > 0 ? Math.round(((current - first) / first) * 100) : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
        <polygon points={area} fill="#2563eb" fillOpacity="0.08" />
        <polyline
          points={line}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Точки минимума (зелёная) и максимума (розовая). */}
        <circle cx={maxPt.x} cy={maxPt.y} r="2.5" fill="#f43f5e" />
        <circle cx={minPt.x} cy={minPt.y} r="2.5" fill="#10b981" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          мин <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(min)}</span>
        </span>
        <span className="text-slate-500">
          сейчас <span className="font-semibold text-slate-700 dark:text-slate-200">{formatPrice(current)}</span>
          {deltaPct !== 0 && (
            <span className={deltaPct < 0 ? 'ml-1 text-emerald-600 dark:text-emerald-400' : 'ml-1 text-rose-500'}>
              {deltaPct > 0 ? '+' : ''}
              {deltaPct}%
            </span>
          )}
        </span>
        <span className="text-slate-500">
          макс <span className="font-medium text-rose-500">{formatPrice(max)}</span>
        </span>
      </div>
    </div>
  );
}
