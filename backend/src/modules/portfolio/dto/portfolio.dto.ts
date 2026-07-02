import { z } from 'zod';
import { createOrderSchema } from '../validation/portfolio.validation';

export type CreateOrderDto = z.infer<typeof createOrderSchema>['body'];
