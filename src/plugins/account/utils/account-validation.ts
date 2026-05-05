/**
 * Account Validation Helpers
 * Utility functions for validating account operations
 */
import { Hbar } from '@hiero-ledger/sdk';

import { TransactionError } from '@/core/errors';

export function validateSufficientBalance(
  availableBalance: bigint,
  requiredBalance: bigint,
  accountId: string,
): void {
  const isBalanceSufficient = availableBalance > requiredBalance;

  if (!isBalanceSufficient) {
    const requiredHbar = Hbar.fromTinybars(
      requiredBalance.toString(),
    ).toString();
    const availableHbar = Hbar.fromTinybars(
      availableBalance.toString(),
    ).toString();

    throw new TransactionError(
      `Insufficient balance in account ${accountId}.\n` +
        `   Required balance:  ${requiredHbar}\n` +
        `   Available balance: ${availableHbar}`,
      false,
      {
        context: { accountId, requiredHbar, availableHbar },
      },
    );
  }
}
