import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ExpectedSignerType } from '@/plugins/eip712/commands/verify/types';

export interface VerifyEcdsaParams {
  signature: string;
  hash: string;
  expectedSigner: ExpectedSignerType | undefined;
  network: SupportedNetwork;
}

export interface VerifyEd25519Params {
  keyManager: KeyManager;
  credential: Credential | undefined;
  signature: string;
  hash: string;
}
