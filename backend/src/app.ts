import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './shared/logger';
import { errorHandler } from './middleware/errorHandler';
import { NotFoundError } from './shared/errors';

import { authRouter } from './modules/auth/routes';
import { marketRouter } from './modules/market/routes';
import { portfolioRouter } from './modules/portfolio/routes';
import { historyRouter } from './modules/history/routes';

import { marketSimulator } from './modules/market/services/market-simulator.service';
import { initializeWebSocketServer } from './config/websocket';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/market', marketRouter);
app.use('/api', portfolioRouter);
app.use('/api', historyRouter);

// Fallback for unhandled routes
app.use('*', (req, _res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

const PORT = config.PORT;

const bootstrap = async () => {
  try {
    initializeWebSocketServer(server);
    marketSimulator.startSimulation(2000);

    server.listen(PORT, () => {
      logger.info(`Server successfully started on port ${PORT} (${config.NODE_ENV})`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

bootstrap();

export { app, server };
