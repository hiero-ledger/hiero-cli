import type {
  Destination,
  ResolvedKey,
  SigningKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManagerName,
} from '@/core/services/kms/kms-types.interface';

export interface KeyResolverService {
  getOrInitKey(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey>;

  getOrInitKeyWithFallback(
    credential: Credential | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<ResolvedKey>;

  resolveSigningKey(
    credential: Credential | undefined,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<SigningKey>;

  resolveDestination(
    credential: Credential,
    keyManager: KeyManagerName,
    labels?: string[],
  ): Promise<Destination>;
}
