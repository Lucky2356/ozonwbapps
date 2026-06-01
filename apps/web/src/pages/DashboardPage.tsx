import { Link } from 'react-router-dom';
import { SearchForm } from '../components/SearchForm';
import { useHistory } from '../api/hooks';
import { marketplaceLabel } from '../lib/format';

export function DashboardPage() {
  const { data: history } = useHistory();
  const recent = (history ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Найдём самое выгодное</h1>
        <p className="mt-1 text-slate-500">
          Выберите маркетплейсы, задайте фильтры — мы сравним и покажем лучшие предложения.
        </p>
      </div>

      <SearchForm />

      {recent.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Недавние поиски</h2>
            <Link to="/history" className="text-sm font-semibold text-brand">
              Вся история
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((h) => (
              <li key={h.searchId} className="flex items-center justify-between py-2.5">
                <Link to={`/results/${h.searchId}`} className="font-medium hover:text-brand">
                  {h.query}
                </Link>
                <span className="text-xs text-slate-400">
                  {h.marketplaces.map(marketplaceLabel).join(', ')} · {h.resultsCount} шт.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
