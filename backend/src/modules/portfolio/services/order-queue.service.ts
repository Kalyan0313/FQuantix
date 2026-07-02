import { cache } from '../../../config/cache';
import { logger } from '../../../shared/logger';

export type OrderHandler = (orderId: string) => Promise<void>;

export class OrderQueueService {
  private static instance: OrderQueueService;
  private queue: string[] = [];
  private handler: OrderHandler | null = null;
  private isProcessing = false;
  private redisQueueKey = 'fquantix:orders:queue';
  private workerActive = false;
  private redisTimeoutId: NodeJS.Timeout | null = null;

  private constructor() {
    // Start Redis poll loop if connected
    this.startRedisWorker();
  }

  public static getInstance(): OrderQueueService {
    if (!OrderQueueService.instance) {
      OrderQueueService.instance = new OrderQueueService();
    }
    return OrderQueueService.instance;
  }

  public registerHandler(handler: OrderHandler): void {
    this.handler = handler;
  }

  public stopQueueWorker(): void {
    this.workerActive = false;
    if (this.redisTimeoutId) {
      clearTimeout(this.redisTimeoutId);
      this.redisTimeoutId = null;
    }
    logger.info('Stopped Redis queue worker.');
  }

  public async addOrder(orderId: string): Promise<void> {
    logger.info(`Adding order ${orderId} to queue...`);
    
    if (cache.isRedisConnected()) {
      try {
        const client = (cache as any).client;
        if (client) {
          await client.lPush(this.redisQueueKey, orderId);
        }
        return;
      } catch (err) {
        logger.error(`Failed to push order ${orderId} to Redis, falling back to memory queue:`, err);
      }
    }

    // In-memory fallback
    this.queue.push(orderId);
    this.processMemoryQueue();
  }

  private async processMemoryQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const orderId = this.queue.shift();
      if (orderId && this.handler) {
        try {
          logger.info(`Processing order ${orderId} from memory queue...`);
          await this.handler(orderId);
        } catch (err) {
          logger.error(`Error executing order ${orderId} in memory queue worker:`, err);
        }
      }
    }

    this.isProcessing = false;
  }

  private async startRedisWorker(): Promise<void> {
    if (this.workerActive) return;
    this.workerActive = true;

    const poll = async () => {
      if (!this.workerActive) return;

      if (cache.isRedisConnected()) {
        try {
          const client = (cache as any).client;
          if (client && this.handler) {
            // RPOP is atomic - perfect for distributed queue workers (only one worker gets the order)
            const orderId = await client.rPop(this.redisQueueKey);
            if (orderId) {
              logger.info(`Processing order ${orderId} from Redis list queue...`);
              try {
                await this.handler(orderId);
              } catch (err) {
                logger.error(`Error executing order ${orderId} inside worker handler:`, err);
              }
            }
          }
        } catch (err) {
          // Ignore list polling errors
        }
      }

      if (this.workerActive) {
        this.redisTimeoutId = setTimeout(poll, 100); // Poll every 100ms
      }
    };

    poll();
  }
}

export const orderQueue = OrderQueueService.getInstance();
export default orderQueue;
