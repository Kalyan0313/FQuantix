import { IPortfolioRepository } from '../repositories/portfolio.repository.interface';
import { marketSimulator } from '../../market/services/market-simulator.service';
import { orderQueue } from './order-queue.service';
import { CreateOrderDto } from '../dto/portfolio.dto';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { Order } from '@prisma/client';

export class PortfolioService {
  constructor(private portfolioRepository: IPortfolioRepository) {
    // Register order execution callback in queue service
    orderQueue.registerHandler(this.executeOrder.bind(this));
  }

  async getPortfolioDetails(userId: string) {
    const portfolio = await this.portfolioRepository.getPortfolioWithHoldings(userId);
    
    let totalInvested = 0;
    let currentHoldingsValue = 0;

    const holdingsWithPnL = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        const currentPrice = await marketSimulator.getPrice(holding.ticker);
        const latestPrice = currentPrice ?? holding.avgBuyPrice;
        
        const investedValue = holding.quantity * holding.avgBuyPrice;
        const currentMarketValue = holding.quantity * latestPrice;
        const unrealizedPnL = currentMarketValue - investedValue;
        const unrealizedPnLPct = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0;

        totalInvested += investedValue;
        currentHoldingsValue += currentMarketValue;

        return {
          id: holding.id,
          ticker: holding.ticker,
          name: holding.name,
          assetType: holding.assetType,
          quantity: holding.quantity,
          avgBuyPrice: holding.avgBuyPrice,
          currentPrice: latestPrice,
          marketValue: Number(currentMarketValue.toFixed(2)),
          unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
          unrealizedPnLPct: Number(unrealizedPnLPct.toFixed(2)),
        };
      })
    );

    const totalValuation = portfolio.balance + currentHoldingsValue;
    const totalPnL = currentHoldingsValue - totalInvested;
    const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return {
      portfolioId: portfolio.id,
      cashBalance: Number(portfolio.balance.toFixed(2)),
      investedValue: Number(totalInvested.toFixed(2)),
      currentHoldingsValue: Number(currentHoldingsValue.toFixed(2)),
      totalValuation: Number(totalValuation.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPct: Number(totalPnLPct.toFixed(2)),
      holdings: holdingsWithPnL,
    };
  }

  async resetUserPortfolio(userId: string) {
    logger.info(`Resetting portfolio for userId: ${userId}`);
    return this.portfolioRepository.resetPortfolio(userId);
  }

  async placeOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    const asset = marketSimulator.getAvailableAssets().find(
      (a) => a.ticker.toUpperCase() === dto.ticker.toUpperCase()
    );

    if (!asset) {
      throw new NotFoundError(`Asset with ticker '${dto.ticker}' is not supported`);
    }

    const currentPrice = await marketSimulator.getPrice(asset.ticker);
    if (!currentPrice) {
      throw new BadRequestError(`Market data not available for ${dto.ticker}. Please try again later.`);
    }

    const totalEstimate = dto.quantity * currentPrice;
    const portfolio = await this.portfolioRepository.getPortfolioWithHoldings(userId);

    // Fast-fail checks (pre-validation before queuing)
    if (dto.orderType === 'BUY') {
      if (portfolio.balance < totalEstimate) {
        throw new BadRequestError(`Insufficient funds. Estimated cost is ₹${totalEstimate.toFixed(2)} but cash balance is ₹${portfolio.balance.toFixed(2)}.`);
      }
    } else if (dto.orderType === 'SELL') {
      const holding = portfolio.holdings.find(
        (h) => h.ticker.toUpperCase() === dto.ticker.toUpperCase()
      );
      if (!holding || holding.quantity < dto.quantity) {
        throw new BadRequestError(`Insufficient holdings. You own ${holding?.quantity ?? 0} shares of ${dto.ticker} but requested to sell ${dto.quantity}.`);
      }
    }

    // Create the PENDING order in DB
    const order = await this.portfolioRepository.createOrder(userId, {
      ticker: asset.ticker,
      name: asset.name,
      assetType: asset.assetType,
      orderType: dto.orderType,
      quantity: dto.quantity,
      price: currentPrice, // Capture current price as estimate
      totalAmount: totalEstimate,
      status: 'PENDING',
    });

    // Enqueue for async execution
    await orderQueue.addOrder(order.id);

    return order;
  }

  /**
   * Worker callback to process queued orders. Runs in background context.
   */
  public async executeOrder(orderId: string): Promise<void> {
    logger.info(`Executing queued order ${orderId}...`);
    
    const order = await this.portfolioRepository.getOrderById(orderId);
    if (!order || order.status !== 'PENDING') {
      logger.warn(`Order ${orderId} not found or already processed. Skipping.`);
      return;
    }

    try {
      // 1. Fetch current live price from feed
      const currentPrice = await marketSimulator.getPrice(order.ticker);
      if (!currentPrice) {
        throw new Error('Market price feed offline');
      }

      // 2. Perform the database transaction (balance & holding updates)
      await this.portfolioRepository.executeOrderTransaction({
        orderId: order.id,
        userId: order.userId,
        ticker: order.ticker,
        name: order.name,
        assetType: order.assetType,
        orderType: order.orderType,
        quantity: order.quantity,
        executionPrice: currentPrice,
      });

      logger.info(`Order ${orderId} executed successfully at price: ₹${currentPrice}`);
    } catch (err: any) {
      logger.error(`Failed executing order ${orderId}: ${err.message}`);
      
      // Update order to FAILED in database
      await this.portfolioRepository.updateOrder(orderId, {
        status: 'FAILED',
      }).catch((dbErr) => {
        logger.error(`Critical: Failed to mark order ${orderId} as FAILED:`, dbErr);
      });
    }
  }
}
export default PortfolioService;
