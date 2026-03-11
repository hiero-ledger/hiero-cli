import type { AccountCreateTransaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface CreateAccountNormalisedParams {
  balance: bigint;
  maxAutoAssociations: number | undefined;
  alias: string | undefined;
  keyRefId: string;
  publicKey: string;
  keyType: KeyAlgorithm;
  network: SupportedNetwork;
}

export interface CreateAccountBuildTransactionResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}

export type CreateAccountSignTransactionResult = Record<string, never>;

export type CreateAccountExecuteTransactionResult = TransactionResult;
