import { Response, NextFunction } from 'express';
import { PortfolioService } from '../services/portfolio.service';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '../../../shared/logger';

export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  getPortfolio = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      logger.info(`Portfolio Get request for userId: ${userId}`);
      const result = await this.portfolioService.getPortfolioDetails(userId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  resetPortfolio = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      logger.info(`Portfolio Reset request for userId: ${userId}`);
      const result = await this.portfolioService.resetUserPortfolio(userId);
      res.status(200).json({
        status: 'success',
        message: 'Portfolio successfully reset to ₹10,00,000 virtual cash and all holdings cleared.',
        data: {
          balance: result.balance,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  placeOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      logger.info(`Order Place request for userId: ${userId}, body: ${JSON.stringify(req.body)}`);
      const result = await this.portfolioService.placeOrder(userId, req.body);
      res.status(202).json({
        status: 'success',
        message: 'Order received and queued for execution',
        data: {
          orderId: result.id,
          ticker: result.ticker,
          orderType: result.orderType,
          quantity: result.quantity,
          estimatedPrice: result.price,
          estimatedTotal: result.totalAmount,
          status: result.status,
          createdAt: result.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
export default PortfolioController;
