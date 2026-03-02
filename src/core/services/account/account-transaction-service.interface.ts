import type { KeyAlgorithm } from '@/core/shared/constants';

/**
 * Interface for Account-related operations
 * All account services must implement this interface
 */
export interface AccountService {
  /**
   * Create a new Hedera account
   */
  createAccount(params: CreateAccountParams): AccountCreateResult;

  /**
   * Get account information (creates a transaction to query account info)
   */
  getAccountInfo(accountId: string): AccountInfoQuery;

  /**
   * Get account balance (creates a transaction to query balance)
   */
  getAccountBalance(accountId: string, tokenId?: string): AccountBalanceQuery;
}

export interface AccountCreateResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}

// Parameter types for account operations
export interface CreateAccountParams {
  balanceRaw: bigint;
  maxAutoAssociations?: number;
  publicKey: string;
  keyType?: KeyAlgorithm;
}

// Import Hedera SDK types
import type {
  AccountBalanceQuery,
  AccountCreateTransaction,
  AccountInfoQuery,
} from '@hashgraph/sdk';
