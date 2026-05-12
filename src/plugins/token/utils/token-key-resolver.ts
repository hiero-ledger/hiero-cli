import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';

export async function resolveOptionalKeys(
  credentials: Credential[],
  keyManager: KeyManager,
  keyResolver: KeyResolverService,
  tag: string,
): Promise<ResolvedPublicKey[]> {
  const results: ResolvedPublicKey[] = [];
  for (const credential of credentials) {
    const resolved = await keyResolver.resolveSigningKey(
      credential,
      keyManager,
      false,
      [tag],
    );
    results.push(resolved);
  }
  return results;
}

export async function resolveOptionalKey(
  credential: Credential | undefined,
  keyManager: KeyManager,
  keyResolver: KeyResolverService,
  tag: string,
): Promise<ResolvedPublicKey | undefined> {
  if (!credential) {
    return undefined;
  }
  return keyResolver.getPublicKey(credential, keyManager, false, [tag]);
}
