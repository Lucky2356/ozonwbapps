/** Пояснение шкалы балла выгодности (0–100) и факторов оценки. */
export function ScoreLegend() {
  return (
    <div className="card space-y-2 p-4 text-sm">
      <p className="font-semibold">Балл выгодности (0–100)</p>
      <p className="text-slate-500">
        Чем выше балл, тем выгоднее предложение. Он учитывает цену относительно средней по выборке,
        рейтинг товара, количество отзывов, размер скидки и репутацию продавца. Подозрительно низкая
        цена и отсутствие отзывов снижают балл.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          ★ 75–100 — выгодно
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          ★ 50–74 — средне
        </span>
        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
          ★ 0–49 — так себе
        </span>
      </div>
    </div>
  );
}
