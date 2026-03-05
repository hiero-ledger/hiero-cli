import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
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
): Promise<ResolvedPublicKey | undefined> {
  if (!credential) {
    return undefined;
  }

  return keyResolver.getPublicKey(credential, keyManager, [tag]);
}

export function toPublicKey(
  key: ResolvedPublicKey | undefined,
): PublicKey | undefined {
  return key ? PublicKey.fromString(key.publicKey) : undefined;
}
