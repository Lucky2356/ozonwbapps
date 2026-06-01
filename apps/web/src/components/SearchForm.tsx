import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useMarketplaces, useCreateSearch } from '../api/hooks';
import { MarketplaceSelector } from './MarketplaceSelector';
import { FiltersPanel } from './FiltersPanel';
import { LoadingState, ErrorState } from './states';
import type { SearchFormValues } from '../api/types';

const DEFAULT_VALUES: SearchFormValues = {
  query: '',
  marketplaces: [],
  minRating: null,
  minReviews: null,
  minPrice: null,
  maxPrice: null,
  sort: 'best_value',
};

export function SearchForm() {
  const navigate = useNavigate();
  const { data: marketplaces, isLoading, isError } = useMarketplaces();
  const createSearch = useCreateSearch();
  const [values, setValues] = useState<SearchFormValues>(DEFAULT_VALUES);
  const [error, setError] = useState<string | null>(null);

  // По умолчанию выбираем все включённые маркетплейсы.
  const enabledIds = (marketplaces ?? []).filter((m) => m.enabled).map((m) => m.id);
  const selected = values.marketplaces.length ? values.marketplaces : enabledIds;

  const patch = (p: Partial<SearchFormValues>) => setValues((v) => ({ ...v, ...p }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.query.trim()) {
      setError('Введите название товара');
      return;
    }
    if (selected.length === 0) {
      setError('Выберите хотя бы один маркетплейс');
      return;
    }
    try {
      const res = await createSearch.mutateAsync({ ...values, marketplaces: selected });
      navigate(`/results/${res.searchId}`);
    } catch {
      setError('Не удалось запустить поиск. Попробуйте ещё раз.');
    }
  };

  if (isLoading) return <LoadingState text="Загрузка маркетплейсов…" />;
  if (isError) return <ErrorState text="Не удалось загрузить список маркетплейсов" />;

  return (
    <form onSubmit={submit} className="card space-y-5 p-5">
      <div>
        <label className="label">Что ищем?</label>
        <input
          className="input text-base"
          placeholder="Например: телефон samsung"
          value={values.query}
          onChange={(e) => patch({ query: e.target.value })}
          autoFocus
        />
      </div>

      <MarketplaceSelector
        marketplaces={marketplaces ?? []}
        selected={selected}
        onChange={(m) => patch({ marketplaces: m })}
      />

      <FiltersPanel values={{ ...values, marketplaces: selected }} onChange={patch} />

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button type="submit" className="btn-primary w-full text-base" disabled={createSearch.isPending}>
        <Search className="h-5 w-5" />
        {createSearch.isPending ? 'Запускаем…' : 'Найти выгодные предложения'}
      </button>
    </form>
  );
}
