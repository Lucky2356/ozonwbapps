import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  MarketplaceInfo,
  SearchResultsResponse,
  SearchStatusResponse,
  HistoryItem,
  Favorite,
  TrackedProduct,
  SearchFormValues,
} from './types';

export function useMarketplaces() {
  return useQuery({
    queryKey: ['marketplaces'],
    queryFn: async () => (await api.get<MarketplaceInfo[]>('/marketplaces')).data,
  });
}

export function useCreateSearch() {
  return useMutation({
    mutationFn: async (values: SearchFormValues) => {
      const payload = {
        query: values.query,
        marketplaces: values.marketplaces,
        sort: values.sort,
        filters: {
          minRating: values.minRating ?? null,
          minReviews: values.minReviews ?? null,
          minPrice: values.minPrice ?? null,
          maxPrice: values.maxPrice ?? null,
        },
      };
      return (await api.post<{ searchId: string; status: string }>('/search', payload)).data;
    },
  });
}

/** Опрашивает статус поиска, пока он не завершится. */
export function useSearchStatus(searchId?: string) {
  return useQuery({
    queryKey: ['search-status', searchId],
    enabled: !!searchId,
    queryFn: async () =>
      (await api.get<SearchStatusResponse>(`/search/${searchId}`)).data,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' ? 1500 : false;
    },
  });
}

export function useSearchResults(searchId?: string, ready?: boolean) {
  return useQuery({
    queryKey: ['search-results', searchId],
    enabled: !!searchId && !!ready,
    queryFn: async () =>
      (await api.get<SearchResultsResponse>(`/search/${searchId}/results`)).data,
  });
}

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: async () => (await api.get<HistoryItem[]>('/search/history')).data,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => (await api.get<Favorite[]>('/favorites')).data,
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fav: Omit<Favorite, 'id' | 'createdAt'>) =>
      (await api.post('/favorites', fav)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/favorites/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

export function useTracked() {
  return useQuery({
    queryKey: ['tracked'],
    queryFn: async () => (await api.get<TrackedProduct[]>('/tracked-products')).data,
  });
}

export function useAddTracked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      marketplace: string;
      title: string;
      productUrl: string;
      targetPrice?: number;
      currentPrice?: number;
    }) => (await api.post('/tracked-products', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked'] }),
  });
}

export function useRemoveTracked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/tracked-products/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked'] }),
  });
}
