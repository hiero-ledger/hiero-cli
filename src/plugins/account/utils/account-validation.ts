/**
 * Account Validation Helpers
 * Utility functions for validating account operations
 */
import { Hbar } from '@hashgraph/sdk';

import { ValidationError } from '@/core';

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

    throw new ValidationError(`Insufficient balance in account ${accountId}.`, {
      context: {
        requiredBalance: requiredHbar,
        availableBalance: availableHbar,
        accountId,
      },
    });
  }
}
