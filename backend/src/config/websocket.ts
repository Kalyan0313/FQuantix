import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { cache } from './cache';
import { logger } from '../shared/logger';

export const initializeWebSocketServer = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  logger.info('WebSocket server initialized.');

  // Subscribe to real-time price channel
  cache.subscribe('market:prices', (message: string) => {
    const payload = JSON.stringify({
      type: 'MARKET_DATA',
      data: JSON.parse(message),
      timestamp: Date.now(),
    });

    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    logger.debug('New client connected to real-time market data WebSocket.');

    // Send initial greeting
    ws.send(JSON.stringify({
      type: 'SYSTEM',
      message: 'Connected to FQuantix real-time price feed.',
    }));

    ws.on('close', () => {
      logger.debug('Client disconnected from WebSocket.');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client connection error:', error);
    });
  });

  return wss;
};
