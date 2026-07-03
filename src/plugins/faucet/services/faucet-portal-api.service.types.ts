import { z } from 'zod';

export type FaucetRequestFundsParams = {
  pat: string;
  address: string;
  amount: number;
  network: string;
};

export type FaucetRequestFundsResult = {
  amount: number;
  transactionId: string;
  dailyQuota: { used: number; remaining: number };
};

export const FaucetRequestFundsResultSchema: z.ZodType<FaucetRequestFundsResult> =
  z.object({
    amount: z.number(),
    transactionId: z.string(),
    dailyQuota: z.object({
      used: z.number(),
      remaining: z.number(),
    }),
  });
