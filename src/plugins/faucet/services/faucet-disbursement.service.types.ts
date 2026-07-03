export type FaucetDisbursementParams = {
  pat: string;
  address: string;
  amount: number;
  network: string;
};

export type FaucetDisbursementResult = {
  amount: number;
  transactionId: string;
  dailyQuota: { used: number; remaining: number };
};
