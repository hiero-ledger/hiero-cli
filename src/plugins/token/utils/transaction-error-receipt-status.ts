import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { TransactionError } from '@/core/errors';

function isTransactionErrorWithStatus(
  error: unknown,
  status: HederaStatus,
): boolean {
  return (
    error instanceof TransactionError &&
    error.cause instanceof ReceiptStatusError &&
    error.cause.status === status
  );
}

export function isNoFreezeKeyError(error: unknown): boolean {
  return isTransactionErrorWithStatus(error, HederaStatus.TokenHasNoFreezeKey);
}

export function isTokenNotAssociatedError(error: unknown): boolean {
  return isTransactionErrorWithStatus(
    error,
    HederaStatus.TokenNotAssociatedToAccount,
  );
}

export function isTokenAlreadyAssociatedError(error: unknown): boolean {
  return isTransactionErrorWithStatus(
    error,
    HederaStatus.TokenAlreadyAssociatedToAccount,
  );
}
