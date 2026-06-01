import { useState } from 'react';
import { ExternalLink, Heart, Bell, Star } from 'lucide-react';
import clsx from 'clsx';
import type { ResultItem } from '../api/types';
import { ScoreBadge } from './ScoreBadge';
import { formatPrice, marketplaceColor, marketplaceLabel } from '../lib/format';

interface Props {
  item: ResultItem;
  isFavorite?: boolean;
  onToggleFavorite?: (item: ResultItem) => void;
  onTrack?: (item: ResultItem) => void;
}

export function ProductCard({ item, isFavorite, onToggleFavorite, onTrack }: Props) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">нет фото</div>
        )}
        <span
          className={clsx(
            'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold',
            marketplaceColor(item.marketplace),
          )}
        >
          {marketplaceLabel(item.marketplace)}
        </span>
        <span className="absolute right-2 top-2">
          <ScoreBadge score={item.score} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium" title={item.title}>
          {item.title}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold">{formatPrice(item.price)}</span>
          {item.oldPrice && (
            <span className="text-sm text-slate-400 line-through">{formatPrice(item.oldPrice)}</span>
          )}
          {item.discountPercent ? (
            <span className="rounded bg-rose-100 px-1.5 text-xs font-semibold text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
              −{item.discountPercent}%
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          {item.rating != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.reviewsCount != null && <span>{item.reviewsCount} отзывов</span>}
        </div>

        {item.scoreReasons.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            {item.scoreReasons.slice(0, 4).map((r, i) => (
              <li key={i} className="flex gap-1">
                <span className="text-emerald-500">•</span>
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <a
            href={item.productUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex-1 text-xs"
          >
            <ExternalLink className="h-4 w-4" /> Открыть
          </a>
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(item)}
              className="btn-ghost px-2.5"
              title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
            >
              <Heart className={clsx('h-4 w-4', isFavorite && 'fill-rose-500 text-rose-500')} />
            </button>
          )}
          {onTrack && (
            <button onClick={() => onTrack(item)} className="btn-ghost px-2.5" title="Отслеживать цену">
              <Bell className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
