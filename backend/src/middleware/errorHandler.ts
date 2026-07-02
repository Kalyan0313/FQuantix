import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { logger } from '../shared/logger';
import { config } from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn(`Operational Error [${req.method} ${req.originalUrl}]: ${err.message} (${err.statusCode})`);
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Unhandled / programming error: log it and return 500
  logger.error(`Unhandled Error [${req.method} ${req.originalUrl}]:`, err);
  
  res.status(500).json({
    status: 'error',
    message: config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    stack: config.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
