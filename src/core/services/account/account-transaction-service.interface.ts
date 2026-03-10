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
}

// Import Hedera SDK types
import type {
  AccountCreateTransaction,
  AccountInfoQuery,
} from '@hashgraph/sdk';
