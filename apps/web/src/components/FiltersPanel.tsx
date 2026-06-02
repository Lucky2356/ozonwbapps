import type { SearchFormValues, SortOption } from '../api/types';
import { SORT_OPTIONS } from '../lib/sort';

interface Props {
  values: SearchFormValues;
  onChange: (patch: Partial<SearchFormValues>) => void;
}

/** Преобразует значение input в число или null. */
function toNum(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function FiltersPanel({ values, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div>
        <label className="label">Рейтинг от</label>
        <input
          className="input"
          type="number"
          step="0.1"
          min="0"
          max="5"
          placeholder="напр. 4.7"
          value={values.minRating ?? ''}
          onChange={(e) => onChange({ minRating: toNum(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">Отзывов от</label>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="напр. 100"
          value={values.minReviews ?? ''}
          onChange={(e) => onChange({ minReviews: toNum(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">Цена от</label>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="₽"
          value={values.minPrice ?? ''}
          onChange={(e) => onChange({ minPrice: toNum(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">Цена до</label>
        <input
          className="input"
          type="number"
          min="0"
          placeholder="₽"
          value={values.maxPrice ?? ''}
          onChange={(e) => onChange({ maxPrice: toNum(e.target.value) })}
        />
      </div>
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <label className="label">Сортировка</label>
        <select
          className="input"
          value={values.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortOption })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
