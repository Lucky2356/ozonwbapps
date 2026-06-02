import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatPrice } from '../lib/format';

interface Props {
  open: boolean;
  title: string;
  currentPrice: number;
  /** Текущее значение целевой цены (для режима редактирования). */
  initialTarget?: number | null;
  onConfirm: (targetPrice: number | null) => void;
  onCancel: () => void;
}

/** Диалог постановки товара на отслеживание с необязательной целевой ценой. */
export function TrackDialog({ open, title, currentPrice, initialTarget, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(initialTarget != null ? String(initialTarget) : '');
  }, [open, initialTarget]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    const n = value.trim() === '' ? null : Number(value);
    onConfirm(Number.isFinite(n as number) && (n as number) > 0 ? (n as number) : null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <Bell className="h-5 w-5 text-brand" /> Отслеживать цену
        </h2>
        <p className="mb-1 line-clamp-2 text-sm text-slate-500">{title}</p>
        <p className="mb-4 text-sm text-slate-500">Текущая цена: {formatPrice(currentPrice)}</p>

        <label className="label" htmlFor="target-price">
          Уведомить, когда цена станет ниже (₽)
        </label>
        <input
          id="target-price"
          className="input"
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="необязательно"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <p className="mt-2 text-xs text-slate-400">
          Оставьте пустым — будем сообщать о любом снижении цены.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            Отмена
          </button>
          <button onClick={submit} className="btn-primary">
            Отслеживать
          </button>
        </div>
      </div>
    </div>
  );
}
