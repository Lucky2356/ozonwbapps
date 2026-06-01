import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useHistory } from '../api/hooks';
import { LoadingState, ErrorState, EmptyState } from '../components/states';
import { marketplaceLabel } from '../lib/format';

const STATUS_LABELS: Record<string, string> = {
  processing: 'В процессе',
  completed: 'Готово',
  failed: 'Ошибка',
};

export function SearchHistoryPage() {
  const { data, isLoading, isError } = useHistory();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState />;
  if (!data || data.length === 0) return <EmptyState text="История поисков пуста." />;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">История поисков</h1>
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {data.map((h) => (
          <Link
            key={h.searchId}
            to={`/results/${h.searchId}`}
            className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="min-w-0">
              <p className="font-medium">{h.query}</p>
              <p className="text-xs text-slate-400">
                {h.marketplaces.map(marketplaceLabel).join(', ')} · {STATUS_LABELS[h.status] ?? h.status}{' '}
                · {h.resultsCount} шт. · {new Date(h.createdAt).toLocaleString('ru-RU')}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
