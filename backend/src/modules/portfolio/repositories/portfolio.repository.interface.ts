import { Portfolio, Holding, Order, Prisma } from '@prisma/client';

export interface IPortfolioRepository {
  getPortfolioWithHoldings(userId: string): Promise<Portfolio & { holdings: Holding[] }>;
  resetPortfolio(userId: string): Promise<Portfolio>;
  createOrder(userId: string, data: Omit<Prisma.OrderCreateInput, 'user'>): Promise<Order>;
  getOrderById(orderId: string): Promise<Order | null>;
  updateOrder(orderId: string, data: Prisma.OrderUpdateInput): Promise<Order>;
  executeOrderTransaction(params: {
    orderId: string;
    userId: string;
    ticker: string;
    name: string;
    assetType: string;
    orderType: string;
    quantity: number;
    executionPrice: number;
  }): Promise<void>;
}
