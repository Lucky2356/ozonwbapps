import clsx from 'clsx';
import type { MarketplaceInfo } from '../api/types';

interface Props {
  marketplaces: MarketplaceInfo[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MarketplaceSelector({ marketplaces, selected, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]);
  };

  return (
    <div>
      <span className="label">Маркетплейсы</span>
      <div className="flex flex-wrap gap-2">
        {marketplaces.map((m) => {
          const active = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              disabled={!m.enabled}
              onClick={() => toggle(m.id)}
              className={clsx(
                'rounded-xl border px-4 py-2 text-sm font-medium transition',
                active
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                !m.enabled && 'cursor-not-allowed opacity-40',
              )}
              title={m.enabled ? m.name : `${m.name} (пока недоступен)`}
            >
              {m.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
