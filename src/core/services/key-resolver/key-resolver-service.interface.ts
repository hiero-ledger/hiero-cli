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
  resolveSigningKey(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<SigningKey>;

  resolveSigningKeyWithFallback(
    credential: Credential | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<SigningKey>;

  resolveDestination(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<Destination>;

  getPublicKey(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedPublicKey>;
}
