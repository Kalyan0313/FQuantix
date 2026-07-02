import { Order } from '@prisma/client';

export interface IHistoryRepository {
  getOrders(params: {
    userId: string;
    ticker?: string;
    orderType?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ orders: Order[]; totalCount: number }>;
}
