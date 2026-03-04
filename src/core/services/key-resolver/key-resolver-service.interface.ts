import type {
  Destination,
  ResolvedPublicKey,
  SigningKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManagerName,
} from '@/core/services/kms/kms-types.interface';

export interface KeyResolverService {
  // Sender side: requires accountId + publicKey + private key in KMS.
  resolveAccountCredentials(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<SigningKey>;

  // Same as resolveAccountCredentials but falls back to operator when credential is undefined.
  resolveAccountCredentialsWithFallback(
    credential: Credential | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<SigningKey>;

  // Receiver side: requires at least accountId or evmAddress, no private key needed.
  resolveDestination(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<Destination>;

  // Read-only key reference: requires publicKey + keyRefId, no account or private key needed.
  getPublicKey(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;

  // Role key (adminKey, supplyKey etc.): requires private key in KMS but no account association.
  resolveSigningKey(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;
}
