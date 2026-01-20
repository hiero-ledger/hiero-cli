import type { Transaction as HederaTransaction } from '@hashgraph/sdk';

/**
 * Interface for transaction execution
 * All transaction services must implement this interface
 */
export interface TxExecutionService {
  /** Sign and execute transaction with operator key (fast path for simple signing) */
  signAndExecute(transaction: HederaTransaction): Promise<TransactionResult>;

  /** Sign and execute with multiple keys (validates, deduplicates, preserves order) */
  signAndExecuteWith(
    transaction: HederaTransaction,
    keyRefIds: string[],
  ): Promise<TransactionResult>;
}

// Result types
export interface TransactionResult {
  transactionId: string;
  success: boolean;
  receipt: TransactionReceipt;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  topicSequenceNumber?: number;
  serialNumbers?: string[];
  consensusTimestamp: string;
}

export interface TransactionStatus {
  status: 'pending' | 'success' | 'failed';
  transactionId: string;
  error?: string;
}

export interface TransactionReceipt {
  status: TransactionStatus;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  topicSequenceNumber?: number;
}
