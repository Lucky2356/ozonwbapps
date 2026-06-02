import { useState } from 'react';
import { Search, Sparkles, BookmarkCheck, X } from 'lucide-react';

const STORAGE_KEY = 'ozonwb-howitworks-hidden';

const STEPS = [
  {
    icon: Search,
    title: '1. Опишите товар',
    text: 'Введите название и выберите маркетплейсы — можно несколько сразу.',
  },
  {
    icon: Sparkles,
    title: '2. Мы сравним и оценим',
    text: 'Соберём предложения и посчитаем балл выгодности по цене, рейтингу и отзывам.',
  },
  {
    icon: BookmarkCheck,
    title: '3. Сохраните и следите',
    text: 'Добавьте в избранное или включите отслеживание цены — сообщим о снижении.',
  },
];

/** Сворачиваемый блок-подсказка «как пользоваться». Скрытие запоминается в localStorage. */
export function HowItWorks() {
  const [hidden, setHidden] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  if (hidden) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setHidden(true);
  };

  return (
    <div className="card relative p-5">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="Скрыть подсказку"
        title="Больше не показывать"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="mb-3 font-bold">Как это работает</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="flex gap-3">
            <s.icon className="h-6 w-6 shrink-0 text-brand" />
            <div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-sm text-slate-500">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
