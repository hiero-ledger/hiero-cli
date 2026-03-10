import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { KeyAlgorithm } from '@/core/shared/constants';

export interface ImportAccountNormalisedParams {
  key: { accountId: string; privateKey: string };
  alias: string | undefined;
  keyManager: KeyManagerName;
  accountId: string;
  network: string;
  accountKey: string;
}

export type ImportAccountBuildTransactionResult = Record<string, never>;
export type ImportAccountSignTransactionResult = Record<string, never>;

export interface ImportAccountExecuteTransactionResult {
  keyRefId: string;
  publicKey: string;
  accountInfo: {
    keyAlgorithm: KeyAlgorithm;
    evmAddress: string | undefined;
    balance: { balance: number };
  };
  evmAddress: string;
}
