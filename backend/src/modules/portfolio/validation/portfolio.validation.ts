import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    ticker: z.string({
      required_error: 'Ticker is required',
    }).min(1, 'Ticker cannot be empty').toUpperCase(),
    orderType: z.enum(['BUY', 'SELL'], {
      required_error: 'Order type must be either BUY or SELL',
    }),
    quantity: z.number({
      required_error: 'Quantity is required',
    }).positive('Quantity must be a positive number'),
  }),
});
