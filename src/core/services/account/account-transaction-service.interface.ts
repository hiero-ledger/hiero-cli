import { KeyAlgorithm } from '../kms/kms-types.interface';

/**
 * Interface for Account-related operations
 * All account services must implement this interface
 */
export interface AccountService {
  /**
   * Create a new Hedera account
   */
  createAccount(params: CreateAccountParams): Promise<AccountCreateResult>;

  /**
   * Get account information (creates a transaction to query account info)
   */
  getAccountInfo(accountId: string): Promise<AccountInfoQuery>;

  /**
   * Get account balance (creates a transaction to query balance)
   */
  getAccountBalance(
    accountId: string,
    tokenId?: string,
  ): Promise<AccountBalanceQuery>;
}

export interface AccountCreateResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
  evmAddress: string;
}

// Parameter types for account operations
export interface CreateAccountParams {
  balanceRaw: bigint;
  maxAutoAssociations?: number;
  publicKey: string;
  keyType?: KeyAlgorithm;
}

// Import Hedera SDK types
import {
  AccountCreateTransaction,
  AccountInfoQuery,
  AccountBalanceQuery,
} from '@hashgraph/sdk';
