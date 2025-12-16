/**
 * Account Validation Helpers
 * Utility functions for validating account operations
 */
import { Hbar } from '@hashgraph/sdk';

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

    throw new Error(
      `Insufficient balance in account ${accountId}.\n` +
        `   Required balance:  ${requiredHbar}\n` +
        `   Available balance: ${availableHbar}`,
    );
  }
}
