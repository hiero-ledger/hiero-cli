import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { MirrorNodeKey } from '@/core/services/mirrornode/types';

export type ResolvedKey = {
  publicKey?: string;
  accountId?: string;
  evmAddress?: string;
  keyRefId?: string;
};

export type ResolvedPublicKey = {
  keyRefId: string;
  publicKey: string;
};

export type ResolvedAccountCredential = {
  keyRefId: string;
  accountId: string;
  publicKey: string;
};

export type Destination =
  | { accountId: string; evmAddress?: string }
  | { accountId?: string; evmAddress: string };

export interface ResolveSigningKeyRefIdsFromMirrorRoleKeyInput {
  mirrorRoleKey: MirrorNodeKey | null | undefined;
  explicitCredentials: Credential[];
  keyManager: KeyManager;
  resolveSigningKeyLabels: string[];
  emptyMirrorRoleKeyMessage: string;
  insufficientKmsMatchesMessage: string;
  validationErrorOptions?: { context?: Record<string, unknown> };
}

export type ResolveSigningKeyRefIdsFromMirrorRoleKeyResult = {
  keyRefIds: string[];
  requiredSignatures: number;
};
