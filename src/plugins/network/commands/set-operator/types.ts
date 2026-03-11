import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManagerName,
} from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface SetOperatorNormalisedParams {
  keyManager: KeyManagerName;
  operatorArg: Credential;
  targetNetwork: SupportedNetwork;
}

export interface SetOperatorExecuteContext {
  existingOperator: {
    accountId: string;
    keyRefId: string;
  } | null;
  operator: ResolvedAccountCredential;
}
