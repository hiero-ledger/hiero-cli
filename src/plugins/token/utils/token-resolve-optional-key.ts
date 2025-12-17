import type { KeyOrAccountAlias } from '@/core/schemas';
import type {
  KeyResolverService,
  ResolvedKey,
} from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

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
