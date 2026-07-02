import { Response, NextFunction } from 'express';
import { HistoryService } from '../services/history.service';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '../../../shared/logger';

export class HistoryController {
  constructor(private historyService: HistoryService) {}

  getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { ticker, orderType, status, page = 1, limit = 10 } = req.query;

      logger.info(`History Get request for userId: ${userId}, query: ${JSON.stringify(req.query)}`);
      
      const result = await this.historyService.getTradeHistory({
        userId,
        ticker: ticker ? String(ticker) : undefined,
        orderType: orderType ? String(orderType) : undefined,
        status: status ? String(status) : undefined,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      logger.info(`Analytics Get request for userId: ${userId}`);
      const result = await this.historyService.getAnalytics(userId);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
export default HistoryController;
