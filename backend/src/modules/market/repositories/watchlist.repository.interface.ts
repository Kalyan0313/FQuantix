import { Watchlist, WatchlistItem } from '@prisma/client';

export interface IWatchlistRepository {
  getOrCreateWatchlist(userId: string): Promise<Watchlist & { items: WatchlistItem[] }>;
  addItem(watchlistId: string, ticker: string, name: string, assetType: string): Promise<WatchlistItem>;
  removeItem(watchlistId: string, ticker: string): Promise<boolean>;
}
