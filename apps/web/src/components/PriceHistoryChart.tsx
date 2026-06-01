interface Point {
  price: number;
  recordedAt: string;
}

/**
 * Простой график истории цен (sparkline на SVG).
 * На первом этапе данных мало (1–2 точки) — это нормально, график-заглушка.
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
  const h = 48;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.price - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
