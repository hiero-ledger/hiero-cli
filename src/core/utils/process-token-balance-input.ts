import { HBAR_DECIMALS, TOKEN_BALANCE_LIMIT } from '@/core/shared/constants';

import { processBalanceInput } from './process-balance-input';

export function processTokenBalanceInput(
  input: string | number,
  decimals: number = HBAR_DECIMALS,
): bigint {
  const balance = processBalanceInput(input, decimals);
  if (balance > TOKEN_BALANCE_LIMIT) {
    throw new Error(
      `Maximum balance for token exceeded. Token balance cannot be greater than ${TOKEN_BALANCE_LIMIT}`,
    );
  }
  return balance;
}
