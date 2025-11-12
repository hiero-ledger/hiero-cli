import type { Transaction as HederaTransaction } from '@hashgraph/sdk';

/**
 * Interface for transaction execution
 * All transaction services must implement this interface
 */
export interface TxExecutionService {
  /**
   * Sign and execute a transaction in one operation
   */
  signAndExecute(transaction: HederaTransaction): Promise<TransactionResult>;

  /**
   * Sign and execute a transaction with specific signer
   */
  signAndExecuteWith(
    tx: HederaTransaction,
    signer: SignerRef,
  ): Promise<TransactionResult>;

  freezeTx(transaction: HederaTransaction): HederaTransaction;
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

export type SignerRef = {
  keyRefId?: string;
  publicKey?: string;
};
