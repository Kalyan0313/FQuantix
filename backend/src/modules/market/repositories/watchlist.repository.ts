import { Watchlist, WatchlistItem } from '@prisma/client';
import { IWatchlistRepository } from './watchlist.repository.interface';
import { prisma } from '../../../config/database';

export class WatchlistRepository implements IWatchlistRepository {
  async getOrCreateWatchlist(userId: string): Promise<Watchlist & { items: WatchlistItem[] }> {
    let watchlist = await prisma.watchlist.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!watchlist) {
      watchlist = await prisma.watchlist.create({
        data: { userId },
        include: { items: true },
      });
    }

    return watchlist;
  }

  async addItem(
    watchlistId: string,
    ticker: string,
    name: string,
    assetType: string
  ): Promise<WatchlistItem> {
    return prisma.watchlistItem.create({
      data: {
        watchlistId,
        ticker,
        name,
        assetType,
      },
    });
  }

  async removeItem(watchlistId: string, ticker: string): Promise<boolean> {
    const result = await prisma.watchlistItem.deleteMany({
      where: {
        watchlistId,
        ticker,
      },
    });
    return result.count > 0;
  }
}
