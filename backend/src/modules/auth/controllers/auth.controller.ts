import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '../../../shared/logger';

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info(`Auth Register request for email: ${req.body.email}`);
      const result = await this.authService.register(req.body);
      res.status(201).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info(`Auth Login request for email: ${req.body.email}`);
      const result = await this.authService.login(req.body);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // req.user is populated by authentication middleware
      const userId = req.user!.id;
      logger.info(`Auth Get Profile request for userId: ${userId}`);
      const profile = await this.authService.getUserProfile(userId);
      res.status(200).json({
        status: 'success',
        data: {
          user: profile,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
