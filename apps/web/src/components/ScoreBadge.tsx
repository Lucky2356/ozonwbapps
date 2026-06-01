import clsx from 'clsx';

interface Props {
  score: number;
  size?: 'sm' | 'lg';
}

/** Бейдж выгодности: цвет зависит от балла. */
export function ScoreBadge({ score, size = 'sm' }: Props) {
  const color =
    score >= 75
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : score >= 50
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-bold',
        color,
        size === 'lg' ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs',
      )}
      title="Оценка выгодности (0–100)"
    >
      ★ {score}
    </span>
  );
}
