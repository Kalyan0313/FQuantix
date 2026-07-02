import { Router } from 'express';
import { WatchlistRepository } from './repositories/watchlist.repository';
import { WatchlistService } from './services/watchlist.service';
import { WatchlistController } from './controllers/watchlist.controller';
import { validate } from '../../middleware/validate';
import { addToWatchlistSchema } from './validation/watchlist.validation';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Dependency Injection Setup
const watchlistRepository = new WatchlistRepository();
const watchlistService = new WatchlistService(watchlistRepository);
const watchlistController = new WatchlistController(watchlistService);

// Market Assets Endpoints
router.get('/assets', authenticate, watchlistController.getMarketAssets);

// Watchlist CRUD Endpoints
router.get('/watchlist', authenticate, watchlistController.getWatchlist);
router.post('/watchlist', authenticate, validate(addToWatchlistSchema), watchlistController.addToWatchlist);
router.delete('/watchlist/:ticker', authenticate, watchlistController.removeFromWatchlist);

export const marketRouter = router;
export { watchlistService };
