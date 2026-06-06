import type { SortOption, MarketplaceInfo } from '@ozonwb/shared';

export type { SortOption, MarketplaceInfo };

export interface ResultItem {
  id: string;
  marketplace: string;
  title: string;
  price: number;
  priceWithCard?: number;
  oldPrice?: number;
  discountPercent?: number;
  rating?: number;
  reviewsCount?: number;
  sellerName?: string;
  sellerRating?: number;
  imageUrl?: string;
  productUrl: string;
  availability: boolean;
  score: number;
  scoreReasons: string[];
}

export interface SearchResultsResponse {
  searchId: string;
  status: 'processing' | 'completed' | 'failed';
  query: string;
  error?: string | null;
  results: ResultItem[];
}

export interface SearchStatusResponse {
  searchId: string;
  status: 'processing' | 'completed' | 'failed';
  query: string;
  marketplaces: string[];
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface HistoryItem {
  searchId: string;
  query: string;
  marketplaces: string[];
  status: string;
  resultsCount: number;
  createdAt: string;
  completedAt?: string | null;
}

export interface Favorite {
  id: string;
  marketplace: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
  imageUrl?: string | null;
  productUrl: string;
  createdAt: string;
}

export interface TrackedProduct {
  id: string;
  marketplace: string;
  title: string;
  productUrl: string;
  targetPrice?: number | null;
  lastPrice?: number | null;
  createdAt: string;
  priceHistory: { id: string; price: number; recordedAt: string }[];
}

export interface Notification {
  id: string;
  type: 'price_drop' | 'target_reached' | 'cheaper_found' | 'historical_low' | string;
  title: string;
  message: string;
  trackedProductId?: string | null;
  productUrl?: string | null;
  read: boolean;
  createdAt: string;
}

export type DigestOption = 'off' | 'daily' | 'weekly';

export interface Profile {
  id: string;
  email: string;
  telegramChatId?: string | null;
  telegramConfigured?: boolean;
  priceDropThresholdPercent?: number;
  telegramDigest?: DigestOption;
}

export interface TelegramLink {
  enabled: boolean;
  code?: string;
  botUsername?: string | null;
  deepLink?: string | null;
}

export interface MarketplaceHealth {
  id: string;
  name: string;
  enabled: boolean;
  lastLevel?: 'info' | 'warn' | 'error' | null;
  lastMessage?: string | null;
  lastAt?: string | null;
}

export interface SearchFormValues {
  query: string;
  marketplaces: string[];
  minRating?: number | null;
  minReviews?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort: SortOption;
}
