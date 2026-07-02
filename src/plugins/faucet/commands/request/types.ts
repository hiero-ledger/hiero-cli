export type FaucetApiResponse = {
  amount: number;
  transactionId: string;
  dailyQuota: { used: number; remaining: number };
};
