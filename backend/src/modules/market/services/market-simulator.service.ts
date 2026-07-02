import { cache } from '../../../config/cache';
import { logger } from '../../../shared/logger';

export interface AssetInfo {
  ticker: string;
  name: string;
  assetType: 'STOCK' | 'CRYPTO';
  basePrice: number;
}

export const SUPPORTED_ASSETS: AssetInfo[] = [
  // Stocks
  { ticker: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', basePrice: 180.50 },
  { ticker: 'TSLA', name: 'Tesla Inc.', assetType: 'STOCK', basePrice: 175.20 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', assetType: 'STOCK', basePrice: 420.10 },
  { ticker: 'GOOG', name: 'Alphabet Inc.', assetType: 'STOCK', basePrice: 150.80 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', assetType: 'STOCK', basePrice: 178.40 },
  // Crypto
  { ticker: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO', basePrice: 65000.00 },
  { ticker: 'ETH', name: 'Ethereum', assetType: 'CRYPTO', basePrice: 3500.00 },
  { ticker: 'SOL', name: 'Solana', assetType: 'CRYPTO', basePrice: 145.00 },
  { ticker: 'ADA', name: 'Cardano', assetType: 'CRYPTO', basePrice: 0.45 },
  { ticker: 'DOT', name: 'Polkadot', assetType: 'CRYPTO', basePrice: 6.20 },
];

export class MarketSimulatorService {
  private static instance: MarketSimulatorService;
  private currentPrices = new Map<string, number>();
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    // Set initial prices
    SUPPORTED_ASSETS.forEach((asset) => {
      this.currentPrices.set(asset.ticker, asset.basePrice);
    });
  }

  public static getInstance(): MarketSimulatorService {
    if (!MarketSimulatorService.instance) {
      MarketSimulatorService.instance = new MarketSimulatorService();
    }
    return MarketSimulatorService.instance;
  }

  public startSimulation(intervalMs = 2000): void {
    if (this.intervalId) return;

    logger.info('Starting Real-time Market Data Simulator...');
    this.intervalId = setInterval(async () => {
      await this.updatePrices();
    }, intervalMs);
  }

  public stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped Real-time Market Data Simulator.');
    }
  }

  private async updatePrices(): Promise<void> {
    const updates: { ticker: string; price: number; timestamp: number }[] = [];

    for (const asset of SUPPORTED_ASSETS) {
      const currentPrice = this.currentPrices.get(asset.ticker) || asset.basePrice;
      
      // Random walk price simulation (between -0.3% and +0.3%)
      const pctChange = (Math.random() * 0.6 - 0.3) / 100;
      const newPrice = Number((currentPrice * (1 + pctChange)).toFixed(2));
      
      this.currentPrices.set(asset.ticker, newPrice);
      
      const cacheKey = `market:price:${asset.ticker}`;
      await cache.set(cacheKey, JSON.stringify({
        ticker: asset.ticker,
        price: newPrice,
        timestamp: Date.now()
      }));

      updates.push({
        ticker: asset.ticker,
        price: newPrice,
        timestamp: Date.now(),
      });
    }

    // Publish updates to Redis / Local PubSub channel for real-time WebSocket distribution
    await cache.publish('market:prices', JSON.stringify(updates));
  }

  public async getPrice(ticker: string): Promise<number | null> {
    const cacheKey = `market:price:${ticker}`;
    const cachedData = await cache.get(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        return parsed.price;
      } catch (err) {
        logger.error(`Error parsing cached price for ${ticker}:`, err);
      }
    }

    // Fallback to internal map if cache fails
    return this.currentPrices.get(ticker) || null;
  }

  public getAvailableAssets(): AssetInfo[] {
    return SUPPORTED_ASSETS;
  }
}

export const marketSimulator = MarketSimulatorService.getInstance();
export default marketSimulator;
