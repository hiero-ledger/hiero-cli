import type { ResolvedKey } from '@/core/services/key-resolver/types';
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
}
