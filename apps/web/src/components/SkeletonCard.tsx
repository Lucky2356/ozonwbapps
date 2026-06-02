/** Плейсхолдер карточки товара во время загрузки (анимированный скелетон). */
export function SkeletonCard() {
  return (
    <div className="card flex animate-pulse flex-col overflow-hidden">
      <div className="aspect-square w-full bg-slate-200 dark:bg-slate-800" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-1 h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-8 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

/** Сетка скелетонов (по умолчанию 8 штук) — совпадает с раскладкой результатов. */
export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
