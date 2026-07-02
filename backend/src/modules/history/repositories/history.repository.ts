import { Order, Prisma } from '@prisma/client';
import { IHistoryRepository } from './history.repository.interface';
import { prisma } from '../../../config/database';

export class HistoryRepository implements IHistoryRepository {
  async getOrders(params: {
    userId: string;
    ticker?: string;
    orderType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ orders: Order[]; totalCount: number }> {
    const { userId, ticker, orderType, status, limit, offset } = params;

    const whereClause: Prisma.OrderWhereInput = {
      userId,
    };

    if (ticker) {
      whereClause.ticker = ticker.toUpperCase();
    }

    if (orderType) {
      whereClause.orderType = orderType;
    }

    if (status) {
      whereClause.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({
        where: whereClause,
      }),
    ]);

    return {
      orders,
      totalCount,
    };
  }
}
export default HistoryRepository;
