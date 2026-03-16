import type {
  Destination,
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';

export interface KeyResolverService {
  // Sender side: requires accountId + publicKey + private key in KMS.
  resolveAccountCredentials(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedAccountCredential>;

  // Receiver side: requires at least accountId or evmAddress, no private key needed.
  resolveDestination(
    credential: Credential,
    keyManager: KeyManager,
    labels?: string[],
  ): Promise<Destination>;

  // Read-only key reference: requires publicKey + keyRefId, no account or private key needed.
  getPublicKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;

  // Role key (adminKey, supplyKey etc.): requires private key in KMS but no account association.
  resolveSigningKey(
    credential: Credential | undefined,
    keyManager: KeyManager,
    fallback?: boolean,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;
}
