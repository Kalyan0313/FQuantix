import { Router } from 'express';
import { PortfolioRepository } from './repositories/portfolio.repository';
import { PortfolioService } from './services/portfolio.service';
import { PortfolioController } from './controllers/portfolio.controller';
import { validate } from '../../middleware/validate';
import { createOrderSchema } from './validation/portfolio.validation';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Dependency Injection Setup
const portfolioRepository = new PortfolioRepository();
const portfolioService = new PortfolioService(portfolioRepository);
const portfolioController = new PortfolioController(portfolioService);

// Portfolio Endpoints
router.get('/portfolio', authenticate, portfolioController.getPortfolio);
router.post('/portfolio/reset', authenticate, portfolioController.resetPortfolio);

// Trading Endpoints
router.post('/orders', authenticate, validate(createOrderSchema), portfolioController.placeOrder);

export const portfolioRouter = router;
export { portfolioService };
