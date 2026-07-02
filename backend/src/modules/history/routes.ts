import { Router } from 'express';
import { HistoryRepository } from './repositories/history.repository';
import { PortfolioRepository } from '../portfolio/repositories/portfolio.repository';
import { HistoryService } from './services/history.service';
import { HistoryController } from './controllers/history.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Dependency Injection Setup
const historyRepository = new HistoryRepository();
const portfolioRepository = new PortfolioRepository();
const historyService = new HistoryService(historyRepository, portfolioRepository);
const historyController = new HistoryController(historyService);

// History & Analytics Endpoints
router.get('/history', authenticate, historyController.getHistory);
router.get('/analytics', authenticate, historyController.getAnalytics);

export const historyRouter = router;
