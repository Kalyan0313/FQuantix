import { z } from 'zod';

export const addToWatchlistSchema = z.object({
  body: z.object({
    ticker: z.string({
      required_error: 'Ticker is required',
    }).min(1, 'Ticker cannot be empty').toUpperCase(),
  }),
});
