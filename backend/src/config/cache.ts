import { createClient, RedisClientType } from 'redis';
import { config } from '.';
import { logger } from '../shared/logger';

interface ICacheManager {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
  isRedisConnected(): boolean;
  disconnect(): Promise<void>;
}

class CacheManager implements ICacheManager {
  private client: RedisClientType | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private memoryStore = new Map<string, string>();
  private subCallbacks = new Map<string, Array<(msg: string) => void>>();
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    if (!config.REDIS_URL) {
      logger.info('Redis URL not configured. Operating in In-Memory fallback mode.');
      return;
    }

    const clientOptions = {
      url: config.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 2) {
            // Stop reconnecting after 2 retries to prevent console spam
            logger.info('Redis connection attempts failed. Continuing in In-Memory fallback mode.');
            return false;
          }
          return 1000;
        },
      },
    };

    try {
      this.client = createClient(clientOptions);
      this.pubClient = createClient(clientOptions);
      this.subClient = createClient(clientOptions);

      const handleErr = (err: unknown) => {
        logger.warn('Redis client error, continuing in In-Memory fallback mode:', err);
        this.isConnected = false;
      };

      this.client.on('error', handleErr);
      this.pubClient.on('error', handleErr);
      this.subClient.on('error', handleErr);

      await Promise.all([
        this.client.connect(),
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      this.isConnected = true;
      logger.info('Successfully connected to Redis. Redis Cache + Pub/Sub is active.');
    } catch (err) {
      logger.warn('Failed to initialize Redis. Operating in In-Memory fallback mode:', err);
      this.isConnected = false;
      this.client = null;
      this.pubClient = null;
      this.subClient = null;
    }
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        logger.error(`Redis Get failed for key ${key}, falling back to memory:`, err);
      }
    }
    return this.memoryStore.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, { EX: ttlSeconds });
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err) {
        logger.error(`Redis Set failed for key ${key}, falling back to memory:`, err);
      }
    }
    this.memoryStore.set(key, value);
    // If TTL is set for memory store, delete it after time
    if (ttlSeconds) {
      setTimeout(() => {
        this.memoryStore.delete(key);
      }, ttlSeconds * 1000);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.isConnected && this.pubClient) {
      try {
        await this.pubClient.publish(channel, message);
        return;
      } catch (err) {
        logger.error(`Redis Publish failed on channel ${channel}, falling back to memory:`, err);
      }
    }
    
    // In-memory Pub/Sub delivery
    const callbacks = this.subCallbacks.get(channel);
    if (callbacks) {
      callbacks.forEach((cb) => cb(message));
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (this.isConnected && this.subClient) {
      try {
        await this.subClient.subscribe(channel, (message) => {
          callback(message);
        });
        return;
      } catch (err) {
        logger.error(`Redis Subscribe failed on channel ${channel}, falling back to memory:`, err);
      }
    }

    // In-memory subscription list
    if (!this.subCallbacks.has(channel)) {
      this.subCallbacks.set(channel, []);
    }
    this.subCallbacks.get(channel)!.push(callback);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    try {
      if (this.client) await this.client.disconnect();
      if (this.pubClient) await this.pubClient.disconnect();
      if (this.subClient) await this.subClient.disconnect();
    } catch (err) {
      // Ignore disconnect errors
    }
  }
}

export const cache = new CacheManager();
export type { ICacheManager };
