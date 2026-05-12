import type {
  AccountCreateTransaction,
  AccountDeleteTransaction,
  AccountUpdateTransaction,
} from '@hiero-ledger/sdk';

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

export interface CreateAccountParams {
  balanceRaw: bigint;
  maxAutoAssociations?: number;
  publicKey: string;
}

export interface DeleteAccountParams {
  accountId: string;
  transferAccountId: string;
}
