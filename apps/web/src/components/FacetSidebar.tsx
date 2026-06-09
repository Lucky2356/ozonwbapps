import { useState } from 'react';
import { X } from 'lucide-react';
import type { Facets, FacetSelection, FacetValue } from '../lib/facets';
import { hasActiveFilters } from '../lib/facets';
import { formatPrice, marketplaceLabel } from '../lib/format';

interface Props {
  facets: Facets;
  selection: FacetSelection;
  onChange: (patch: Partial<FacetSelection>) => void;
  onReset: () => void;
  /** Запрос сам про аксессуар — тогда тоггл «без аксессуаров» не показываем. */
  accessoryQuery: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-200/70 py-4 first:pt-0 last:border-0 dark:border-slate-800">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/** Список чекбоксов с counts и «показать ещё». */
function CheckList({
  values,
  selected,
  onToggle,
  labelFn,
  limit = 8,
}: {
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  labelFn?: (value: string) => string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? values : values.slice(0, limit);
  return (
    <div className="space-y-1.5">
      {shown.map((f) => (
        <label key={f.value} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
            checked={selected.includes(f.value)}
            onChange={() => onToggle(f.value)}
          />
          <span className="flex-1 truncate text-slate-600 dark:text-slate-300">
            {labelFn ? labelFn(f.value) : f.value}
          </span>
          <span className="text-xs text-slate-400">{f.count}</span>
        </label>
      ))}
      {values.length > limit && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-brand hover:underline"
        >
          {expanded ? 'Свернуть' : `Показать ещё ${values.length - limit}`}
        </button>
      )}
    </div>
  );
}

const RATINGS = [
  { value: 4.5, label: 'от 4.5' },
  { value: 4, label: 'от 4.0' },
  { value: 3, label: 'от 3.0' },
];

export function FacetSidebar({ facets, selection, onChange, onReset, accessoryQuery }: Props) {
  const toggleIn = (field: 'brands' | 'categories' | 'marketplaces', value: string) => {
    const cur = selection[field];
    onChange({ [field]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };
  const toNum = (v: string): number | null => (v.trim() === '' ? null : Number(v) || null);

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">Фильтры</h2>
        {hasActiveFilters(selection) && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-500"
          >
            <X className="h-3.5 w-3.5" /> Сбросить
          </button>
        )}
      </div>

      <Section title="Цена, ₽">
        <div className="flex items-center gap-2">
          <input
            className="input py-1.5"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={facets.priceMin ? String(Math.floor(facets.priceMin)) : 'от'}
            value={selection.minPrice ?? ''}
            onChange={(e) => onChange({ minPrice: toNum(e.target.value) })}
          />
          <span className="text-slate-400">—</span>
          <input
            className="input py-1.5"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={facets.priceMax ? String(Math.ceil(facets.priceMax)) : 'до'}
            value={selection.maxPrice ?? ''}
            onChange={(e) => onChange({ maxPrice: toNum(e.target.value) })}
          />
        </div>
        {facets.priceMax > 0 && (
          <p className="mt-1.5 text-xs text-slate-400">
            от {formatPrice(facets.priceMin)} до {formatPrice(facets.priceMax)}
          </p>
        )}
      </Section>

      {facets.categories.length > 1 && (
        <Section title="Тип товара">
          <CheckList
            values={facets.categories}
            selected={selection.categories}
            onToggle={(v) => toggleIn('categories', v)}
          />
        </Section>
      )}

      {facets.brands.length > 0 && (
        <Section title="Бренд">
          <CheckList
            values={facets.brands}
            selected={selection.brands}
            onToggle={(v) => toggleIn('brands', v)}
          />
        </Section>
      )}

      {facets.marketplaces.length > 1 && (
        <Section title="Маркетплейс">
          <CheckList
            values={facets.marketplaces}
            selected={selection.marketplaces}
            onToggle={(v) => toggleIn('marketplaces', v)}
            labelFn={marketplaceLabel}
          />
        </Section>
      )}

      <Section title="Рейтинг">
        <div className="space-y-1.5">
          {RATINGS.map((r) => (
            <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="minRating"
                className="h-4 w-4 border-slate-300 text-brand focus:ring-brand/30"
                checked={selection.minRating === r.value}
                onChange={() => onChange({ minRating: r.value })}
              />
              <span className="text-slate-600 dark:text-slate-300">{r.label}</span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="minRating"
              className="h-4 w-4 border-slate-300 text-brand focus:ring-brand/30"
              checked={selection.minRating == null}
              onChange={() => onChange({ minRating: null })}
            />
            <span className="text-slate-600 dark:text-slate-300">любой</span>
          </label>
        </div>
      </Section>

      <Section title="Дополнительно">
        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
              checked={selection.onlyDiscount}
              onChange={(e) => onChange({ onlyDiscount: e.target.checked })}
            />
            <span className="flex-1 text-slate-600 dark:text-slate-300">Только со скидкой</span>
            <span className="text-xs text-slate-400">{facets.discountCount}</span>
          </label>
          {!accessoryQuery && facets.accessoryCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                checked={selection.excludeAccessories}
                onChange={(e) => onChange({ excludeAccessories: e.target.checked })}
              />
              <span className="flex-1 text-slate-600 dark:text-slate-300">Без аксессуаров</span>
              <span className="text-xs text-slate-400">−{facets.accessoryCount}</span>
            </label>
          )}
        </div>
      </Section>
    </div>
  );
}
