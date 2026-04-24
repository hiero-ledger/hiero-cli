import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

import { TransactionError } from '@/core/errors';

export function isNoFreezeKeyError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenHasNoFreezeKey
  );
}

export function isNoPauseKeyError(error: unknown): boolean {
  if (!(error instanceof TransactionError)) {
    return false;
  }

  const cause = error.cause;
  return (
    cause instanceof ReceiptStatusError &&
    cause.status === HederaStatus.TokenHasNoPauseKey
  );
}
