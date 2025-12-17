import type { KeyOrAccountAlias } from '@/core/schemas';
import type {
  KeyResolverService,
  ResolvedKey,
} from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

import { PublicKey } from '@hashgraph/sdk';

export async function resolveOptionalKey(
  keyOrAlias: KeyOrAccountAlias | undefined,
  keyManager: KeyManagerName,
  keyResolver: KeyResolverService,
  tag: string,
): Promise<ResolvedKey | undefined> {
  if (!keyOrAlias) {
    return undefined;
  }

  return keyResolver.getOrInitKey(keyOrAlias, keyManager, [tag]);
}

export function toPublicKey(
  key: ResolvedKey | undefined,
): PublicKey | undefined {
  return key ? PublicKey.fromString(key.publicKey) : undefined;
}
