/**
 * Interface for Account-related operations
 * All account services must implement this interface
 */
import type {
  AccountCreateTransaction,
  AccountDeleteTransaction,
  AccountInfoQuery,
  AccountUpdateTransaction,
} from '@hashgraph/sdk';

export interface AccountService {
  createAccount(params: CreateAccountParams): AccountCreateResult;
  deleteAccount(params: DeleteAccountParams): AccountDeleteResult;
  updateAccount(params: UpdateAccountParams): AccountUpdateResult;
  getAccountInfo(accountId: string): AccountInfoQuery;
}

export interface UpdateAccountParams {
  accountId: string;
  key?: string;
  memo?: string | null;
  maxAutoAssociations?: number;
  stakedAccountId?: string | null;
  stakedNodeId?: number | null;
  declineStakingReward?: boolean;
  autoRenewPeriod?: number;
  receiverSignatureRequired?: boolean;
}

export interface AccountUpdateResult {
  transaction: AccountUpdateTransaction;
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