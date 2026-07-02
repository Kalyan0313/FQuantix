import { Portfolio, Holding, Order, Prisma } from '@prisma/client';
import { IPortfolioRepository } from './portfolio.repository.interface';
import { prisma } from '../../../config/database';
import { AppError } from '../../../shared/errors';

export class PortfolioRepository implements IPortfolioRepository {
  async getPortfolioWithHoldings(userId: string): Promise<Portfolio & { holdings: Holding[] }> {
    let portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: { holdings: true },
    });

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: { userId },
        include: { holdings: true },
      });
    }

    return portfolio;
  }

  async resetPortfolio(userId: string): Promise<Portfolio> {
    return prisma.$transaction(async (tx) => {
      // 1. Delete all holdings
      const portfolio = await tx.portfolio.findUnique({ where: { userId } });
      if (portfolio) {
        await tx.holding.deleteMany({
          where: { portfolioId: portfolio.id },
        });
      }

      // 2. Reset balance to default 10,00,000
      return tx.portfolio.upsert({
        where: { userId },
        create: {
          userId,
          balance: 1000000.0,
        },
        update: {
          balance: 1000000.0,
        },
      });
    });
  }

  async createOrder(userId: string, data: Omit<Prisma.OrderCreateInput, 'user'>): Promise<Order> {
    return prisma.order.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id: orderId },
    });
  }

  async updateOrder(orderId: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return prisma.order.update({
      where: { id: orderId },
      data,
    });
  }

  async executeOrderTransaction(params: {
    orderId: string;
    userId: string;
    ticker: string;
    name: string;
    assetType: string;
    orderType: string;
    quantity: number;
    executionPrice: number;
  }): Promise<void> {
    const {
      orderId,
      userId,
      ticker,
      name,
      assetType,
      orderType,
      quantity,
      executionPrice,
    } = params;

    const totalCost = quantity * executionPrice;

    await prisma.$transaction(async (tx) => {
      // 1. Fetch portfolio with lock (or standard find to inspect balance)
      const portfolio = await tx.portfolio.findUnique({
        where: { userId },
      });

      if (!portfolio) {
        throw new AppError('Portfolio not found', 404);
      }

      // 2. Double check balances/holdings under isolation
      if (orderType === 'BUY') {
        if (portfolio.balance < totalCost) {
          throw new AppError('Insufficient balance to execute this trade', 400);
        }

        // Deduct balance
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { balance: { decrement: totalCost } },
        });

        // Add/Update holding
        const existingHolding = await tx.holding.findUnique({
          where: {
            portfolioId_ticker: {
              portfolioId: portfolio.id,
              ticker,
            },
          },
        });

        if (existingHolding) {
          const newQty = existingHolding.quantity + quantity;
          const newAvgPrice = ((existingHolding.quantity * existingHolding.avgBuyPrice) + totalCost) / newQty;
          
          await tx.holding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: newQty,
              avgBuyPrice: Number(newAvgPrice.toFixed(4)),
            },
          });
        } else {
          await tx.holding.create({
            data: {
              portfolioId: portfolio.id,
              ticker,
              name,
              assetType,
              quantity,
              avgBuyPrice: executionPrice,
            },
          });
        }
      } else if (orderType === 'SELL') {
        const holding = await tx.holding.findUnique({
          where: {
            portfolioId_ticker: {
              portfolioId: portfolio.id,
              ticker,
            },
          },
        });

        if (!holding || holding.quantity < quantity) {
          throw new AppError('Insufficient assets to execute this trade', 400);
        }

        // Credit balance
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: { balance: { increment: totalCost } },
        });

        // Deduct holding
        const remainingQty = holding.quantity - quantity;
        if (remainingQty <= 0) {
          await tx.holding.delete({
            where: { id: holding.id },
          });
        } else {
          await tx.holding.update({
            where: { id: holding.id },
            data: { quantity: remainingQty },
          });
        }
      }

      // 3. Update order to COMPLETED
      await tx.order.update({
        where: { id: orderId },
        data: {
          price: executionPrice,
          totalAmount: totalCost,
          status: 'COMPLETED',
        },
      });
    });
  }
}
export default PortfolioRepository;
