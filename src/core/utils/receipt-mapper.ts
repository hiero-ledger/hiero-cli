import type { TransactionReceipt } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';

import { Status } from '@hashgraph/sdk';

function toEntityIdString(
  entity: { toString(): string } | null | undefined,
): string | undefined {
  return entity ? entity.toString() : undefined;
}

export function mapReceiptToTransactionResult(
  transactionId: string,
  receipt: TransactionReceipt,
  consensusTimestamp?: string,
): TransactionResult {
  let accountId: string | undefined;
  let tokenId: string | undefined;
  let topicId: string | undefined;
  let topicSequenceNumber: number | undefined;
  let serials: string[] | undefined;
  let contractId: string | undefined;

  if (receipt.accountId) {
    accountId = receipt.accountId.toString();
  }

  if (receipt.tokenId) {
    tokenId = receipt.tokenId.toString();
  }

  if (receipt.topicId) {
    topicId = receipt.topicId.toString();
  }

  if (receipt.topicSequenceNumber) {
    topicSequenceNumber = Number(receipt.topicSequenceNumber);
  }

  if (receipt.serials && receipt.serials.length > 0) {
    serials = receipt.serials.map((serial) => serial.toString());
  }

  if (receipt.contractId) {
    contractId = toEntityIdString(receipt.contractId);
  }

  let scheduleId: string | undefined;
  if (receipt.scheduleId) {
    scheduleId = receipt.scheduleId.toString();
  }

  const success = receipt.status === Status.Success;

  return {
    transactionId,
    success,
    consensusTimestamp: consensusTimestamp ?? new Date().toISOString(),
    accountId,
    tokenId,
    topicId,
    contractId,
    topicSequenceNumber,
    scheduleId,
    receipt: {
      status: {
        status: success ? 'success' : 'failed',
        transactionId,
      },
      serials,
    },
  };
}
