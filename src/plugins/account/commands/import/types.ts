import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface ImportAccountNormalisedParams {
  key: { accountId: string; privateKey: string };
  alias: string | undefined;
  keyManager: KeyManagerName;
  accountId: string;
  network: SupportedNetwork;
  accountKey: string;
}

export type ImportAccountBuildTransactionResult = Record<string, never>;
export type ImportAccountSignTransactionResult = Record<string, never>;

export interface ImportAccountExecuteTransactionResult {
  keyRefId: string;
  publicKey: string;
  accountInfo: {
    keyAlgorithm: KeyAlgorithm;
    evmAddress?: string;
    balance: { balance: number };
  };
  evmAddress: string;
}
