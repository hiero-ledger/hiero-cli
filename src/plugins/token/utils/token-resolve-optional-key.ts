import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { ResolvedKey } from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManagerName,
} from '@/core/services/kms/kms-types.interface';

import { PublicKey } from '@hashgraph/sdk';

export async function resolveOptionalKey(
  credential: Credential | undefined,
  keyManager: KeyManagerName,
  keyResolver: KeyResolverService,
  tag: string,
): Promise<ResolvedKey | undefined> {
  if (!credential) {
    return undefined;
  }

  return keyResolver.getOrInitKey(credential, keyManager, [tag]);
}

export function toPublicKey(
  key: ResolvedKey | undefined,
): PublicKey | undefined {
  return key ? PublicKey.fromString(key.publicKey) : undefined;
}
