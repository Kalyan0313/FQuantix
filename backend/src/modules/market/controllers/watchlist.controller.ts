import { Response, NextFunction } from 'express';
import { WatchlistService } from '../services/watchlist.service';
import { marketSimulator } from '../services/market-simulator.service';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '../../../shared/logger';

export class WatchlistController {
  constructor(private watchlistService: WatchlistService) {}

  getWatchlist = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      logger.info(`Watchlist Get request for userId: ${userId}`);
      const result = await this.watchlistService.getWatchlist(userId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  addToWatchlist = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { ticker } = req.body;
      logger.info(`Watchlist Add item: ${ticker} for userId: ${userId}`);
      const result = await this.watchlistService.addToWatchlist(userId, ticker);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  removeFromWatchlist = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { ticker } = req.params;
      logger.info(`Watchlist Remove item: ${ticker} for userId: ${userId}`);
      await this.watchlistService.removeFromWatchlist(userId, ticker);
      res.status(200).json({
        status: 'success',
        message: `Ticker '${ticker}' was removed from your watchlist`,
      });
    } catch (error) {
      next(error);
    }
  };

  getMarketAssets = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info(`Market Assets list request`);
      const assets = marketSimulator.getAvailableAssets();
      
      const assetsWithPrices = await Promise.all(
        assets.map(async (asset) => {
          const price = await marketSimulator.getPrice(asset.ticker);
          return {
            ...asset,
            price: price ?? asset.basePrice,
          };
        })
      );

      res.status(200).json({
        status: 'success',
        data: {
          assets: assetsWithPrices,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
export default WatchlistController;
