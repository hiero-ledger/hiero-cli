/**
 * Interface for Account-related operations
 * All account services must implement this interface
 */
import type {
  AccountCreateTransaction,
  AccountDeleteTransaction,
  AccountInfoQuery,
} from '@hashgraph/sdk';

export interface AccountService {
  /**
   * Create a new Hedera account
   */
  createAccount(params: CreateAccountParams): AccountCreateResult;

  /**
   * Build an account delete transaction (must be signed by the deleted account)
   */
  deleteAccount(params: DeleteAccountParams): AccountDeleteResult;

  /**
   * Get account information (creates a transaction to query account info)
   */
  getAccountInfo(accountId: string): AccountInfoQuery;
}

export interface AccountCreateResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}

export interface AccountDeleteResult {
  transaction: AccountDeleteTransaction;
}

// Parameter types for account operations
export interface CreateAccountParams {
  balanceRaw: bigint;
  maxAutoAssociations?: number;
  publicKey: string;
}

export interface DeleteAccountParams {
  accountId: string;
  transferAccountId: string;
}
