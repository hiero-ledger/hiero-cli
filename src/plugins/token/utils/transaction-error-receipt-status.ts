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

export function isNoPauseKeyError(error: unknown): boolean {
  return isTransactionErrorWithStatus(error, HederaStatus.TokenHasNoPauseKey);
}

export function isNoKycKeyError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenHasNoKycKey
  );
}
