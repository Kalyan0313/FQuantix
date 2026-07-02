import { IWatchlistRepository } from '../repositories/watchlist.repository.interface';
import { marketSimulator } from '../services/market-simulator.service';
import { NotFoundError, ConflictError } from '../../../shared/errors';

export class WatchlistService {
  constructor(private watchlistRepository: IWatchlistRepository) {}

  async getWatchlist(userId: string) {
    const watchlist = await this.watchlistRepository.getOrCreateWatchlist(userId);
    
    // Map items to include latest simulated price
    const itemsWithPrices = await Promise.all(
      watchlist.items.map(async (item) => {
        const latestPrice = await marketSimulator.getPrice(item.ticker);
        return {
          id: item.id,
          ticker: item.ticker,
          name: item.name,
          assetType: item.assetType,
          price: latestPrice ?? 0,
        };
      })
    );

    return {
      id: watchlist.id,
      userId: watchlist.userId,
      items: itemsWithPrices,
    };
  }

  async addToWatchlist(userId: string, ticker: string) {
    const asset = marketSimulator.getAvailableAssets().find(
      (a) => a.ticker.toUpperCase() === ticker.toUpperCase()
    );

    if (!asset) {
      throw new NotFoundError(`Asset with ticker '${ticker}' is not supported`);
    }

    const watchlist = await this.watchlistRepository.getOrCreateWatchlist(userId);
    
    // Check if already in watchlist
    const alreadyExists = watchlist.items.some(
      (item) => item.ticker.toUpperCase() === ticker.toUpperCase()
    );

    if (alreadyExists) {
      throw new ConflictError(`Ticker '${ticker}' is already in your watchlist`);
    }

    return this.watchlistRepository.addItem(
      watchlist.id,
      asset.ticker,
      asset.name,
      asset.assetType
    );
  }

  async removeFromWatchlist(userId: string, ticker: string): Promise<void> {
    const watchlist = await this.watchlistRepository.getOrCreateWatchlist(userId);
    
    const wasRemoved = await this.watchlistRepository.removeItem(watchlist.id, ticker);
    if (!wasRemoved) {
      throw new NotFoundError(`Ticker '${ticker}' was not found in your watchlist`);
    }
  }
}
export default WatchlistService;
